// middleware/requireProfileReady.js
const { getProfileCompletion } = require('../utils/profileCompletion');

module.exports = (req, res, next) => {
  if (req.user.role !== 'worker') return next();

  const { canPostService, steps } = getProfileCompletion(req.user);
  if (canPostService) return next();

  const missing  = steps.filter(s => !s.done && !s.pending && s.requiredToPost).map(s => s.label);
  const pending  = steps.filter(s => s.pending && s.requiredToPost).map(s => s.label);

  let msg = 'Complete your profile before posting services.';
  if (missing.length)  msg += ` Still needed: ${missing.join('; ')}.`;
  if (pending.length)  msg += ` Under review: ${pending.join('; ')}.`;

  req.flash('error', msg);
  res.redirect('/dashboard/profile');
};
