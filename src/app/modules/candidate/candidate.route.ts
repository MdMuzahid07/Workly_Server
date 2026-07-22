import express from 'express';
import { UserRole } from '../../../generated/prisma/index.js';
import authValidator from '../../middleware/authValidator.js';
import requestValidator from '../../middleware/requestValidator.js';
import candidateController from './candidate.controller.js';
import candidateValidation from './candidate.validation.js';

const router = express.Router();

router.get(
  '/',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.JOB_SEEKER),
  candidateController.getAllCandidates,
);

router.get(
  '/saved',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  candidateController.getSavedCandidates,
);

router.get(
  '/skills/facets',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.JOB_SEEKER),
  candidateController.getCandidateSkillFacets,
);

router.get(
  '/locations/facets',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.JOB_SEEKER),
  candidateController.getCandidateLocationFacets,
);

router.get(
  '/:id',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.JOB_SEEKER),
  candidateController.getCandidateById,
);

router.post(
  '/save',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(candidateValidation.toggleSaveCandidate),
  candidateController.toggleSaveCandidate,
);

const candidateRoute = router;
export default candidateRoute;
