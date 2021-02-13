/* eslint-disable import/no-unresolved */
import express from 'express';
import { check, validationResult } from 'express-validator';
import xss from 'xss';
import { insert, query } from './db.js';

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function sanitizeXss(fieldName) {
  return (req, res, next) => {
    if (!req.body) {
      next();
    }
    const field = req.body[fieldName];
    if (field) {
      req.body[fieldName] = xss(field);
    }
    next();
  };
}

export const router = express.Router();

const validations = [
  check('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),

  check('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),

  check('nationalId')
    .isLength({ min: 1 })
    .withMessage('Kennitala má ekki vera tóm'),

  check('nationalId')
    .matches(/^[0-9]{6}-?[0-9]{4}$/)
    .withMessage('Kennitala á að vera á formi 000000-0000 eða 0000000000'),

  check('comment')
    .isLength({ max: 100 })
    .withMessage('Athugasemd má að hámarki vera 100 stafir'),
];

const sanitazions = [
  check('name').trim().escape(),
  sanitizeXss('name'),

  sanitizeXss('nationalId'),
  check('nationalId')
    .trim().blacklist('-').escape()
    .toInt(),

  sanitizeXss('comment'),
  check('comment').trim().escape(),
];

async function form(req, res) {
  const data = {
    title: 'Undirskriftarlisti',
    name: '',
    nationalId: '',
    comment: '',
    anonymous: '',
    date: '',
    errors: [],
  };
  const result = await query('SELECT * from signatures;');
  const { rows } = result;
  const { rowCount } = result;

  res.render('form', { data, rows, rowCount });
}

/**
   * Route handler sem athugar stöðu á umsókn og birtir villur ef einhverjar,
   * sendir annars áfram í næsta middleware.
   *
   * @param {object} req Request hlutur
   * @param {object} res Response hlutur
   * @param {function} next Næsta middleware
   * @returns Næsta middleware ef í lagi, annars síðu með villum
   */
async function showErrors(req, res, next) {
  const {
    body: {
      title = 'Undirskriftarlisti',
      name = '',
      nationalId = '',
      comment = '',
      anonymous = 'false',
    } = {},
  } = req;

  const data = {
    title,
    name,
    nationalId,
    comment,
    anonymous,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    const errors = validation.array();
    data.errors = errors;
    data.title = 'Undirskriftarlisti – vandræði';

    const result = await query('SELECT * FROM signatures');
    const { rows } = result;
    const { rowCount } = result;

    return res.render('form', { data, rows, rowCount });
  }

  return next();
}

async function formPost(req, res) {
  const {
    body: {
      name = '',
      nationalId = '',
      comment = '',
      anonymous = 'false',
    } = {},
  } = req;

  const data = {
    name,
    nationalId,
    comment,
    anonymous,
  };

  await insert(data);
  form(req, res);
}

router.use(express.urlencoded({ extended: true }));
router.get('/', catchErrors(form));

router.post(
  '/',
  // Athugar hvort form sé í lagi
  validations,
  // Ef form er ekki í lagi, birtir upplýsingar um það
  showErrors,
  // Öll gögn í lagi, hreinsa þau
  sanitazions,
  // Senda gögn í gagnagrunn
  catchErrors(formPost),
);
