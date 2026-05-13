const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const {
  listRiderJobOffers,
  acceptJobOffer,
  rejectJobOffer,
} = require("../matching/matchingService");

const riderJobOffersRouter = express.Router();

riderJobOffersRouter.use(requireAuth, requireRole("rider"));

riderJobOffersRouter.get("/", (req, res, next) => {
  try {
    res.json({ jobOffers: listRiderJobOffers(req.user.id) });
  } catch (error) {
    next(error);
  }
});

riderJobOffersRouter.post("/:id/accept", (req, res, next) => {
  try {
    res.json(acceptJobOffer(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

riderJobOffersRouter.post("/:id/reject", (req, res, next) => {
  try {
    res.json(rejectJobOffer(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

module.exports = { riderJobOffersRouter };
