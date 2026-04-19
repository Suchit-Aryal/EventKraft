// ============================================================
// Review Routes — /reviews/*
// ============================================================

const express = require('express');
const router = express.Router();
const reviewCtrl = require('../controllers/reviewController');
const { ensureAuthenticated } = require('../middleware/auth');

// POST /reviews         – Submit a review
router.post('/', ensureAuthenticated, reviewCtrl.store);

// GET  /reviews/user/:id – View reviews for a user
router.get('/user/:id', reviewCtrl.userReviews);

module.exports = router;
