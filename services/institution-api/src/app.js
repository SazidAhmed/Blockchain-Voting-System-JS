const express = require('express');
const cors    = require('cors');

const healthRoute    = require('./routes/health');
const membersRoute   = require('./routes/members');
const lookupRoute    = require('./routes/lookup');
const voterPickerRoute = require('./routes/voter-picker');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRoute);
app.use(membersRoute);
app.use(lookupRoute);
app.use(voterPickerRoute);

app.use(errorHandler);

module.exports = app;
