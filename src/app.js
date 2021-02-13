// eslint-disable-next-line import/no-unresolved
import express from 'express';
// eslint-disable-next-line import/no-unresolved
import dotenv from 'dotenv';
// eslint-disable-next-line import/no-unresolved
import date from 'date-and-time';
// eslint-disable-next-line import/no-unresolved
import { router } from './registration.js';

dotenv.config();

const {
  PORT: port = 3000,
} = process.env;

const app = express();

app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.static('public'));

function isInvalid(field, errors) {
  return Boolean(errors.find((i) => i.param === field));
}

function parseDate(d) {
  return date.format(new Date(d), 'DD[.]MM[.]YYYY');
}

app.locals.isInvalid = isInvalid;
app.locals.parseDate = parseDate;

app.use('/', router);

function notFoundHandler(req, res, next) { // eslint-disable-line
  res.status(404).render('error', { title: '404', error: '404 fannst ekki' });
}

function errorHandler(error, req, res, next) { // eslint-disable-line
  console.error(error);
  res.status(500).render('error', { title: 'Villa', error });
}

app.use(notFoundHandler);
app.use(errorHandler);

// TODO setja upp rest af virkni!

// Verðum að setja bara *port* svo virki á heroku
app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});
