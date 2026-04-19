// ============================================================
// Models Index — Export all models from a single file
// ============================================================
// Usage: const { User, Job, Gig, Booking } = require('./models');

const User = require('./User');
const Profile = require('./Profile');
const Category = require('./Category');
const Job = require('./Job');
const Proposal = require('./Proposal');
const Gig = require('./Gig');
const GigPackage = require('./GigPackage');
const Booking = require('./Booking');
const Review = require('./Review');
const Message = require('./Message');
const Transaction = require('./Transaction');
const Notification = require('./Notification');
const Dispute = require('./Dispute');
const CommissionSetting = require('./CommissionSetting');

module.exports = {
    User,
    Profile,
    Category,
    Job,
    Proposal,
    Gig,
    GigPackage,
    Booking,
    Review,
    Message,
    Transaction,
    Notification,
    Dispute,
    CommissionSetting
};
