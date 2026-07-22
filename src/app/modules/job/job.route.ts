import express from 'express';
import { UserRole } from '../../../generated/prisma/index.js';
import authValidator from '../../middleware/authValidator.js';
import requestValidator from '../../middleware/requestValidator.js';
import { requireEntitlement } from '../../middleware/requireEntitlement.js';
import jobController from './job.controller.js';
import jobValidation from './job.validation.js';

const router = express.Router();

router
  .post(
    '/create',
    authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    requireEntitlement('maxActiveJobs'),
    requestValidator(jobValidation.createJob),
    jobController.createJob,
  )
  .get('/suggestions', jobController.getSearchSuggestions)
  .get('/skills/facets', jobController.getSkillFacets)
  .get('/locations/facets', jobController.getLocationFacets)
  .get('/jobs', jobController.getJobs);

router.get(
  '/my-jobs',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  jobController.getMyJobs,
);

router.get('/recommended', authValidator(UserRole.JOB_SEEKER), jobController.getRecommendedJobs);

router.get('/job/:jobId', jobController.getJobById);

router.patch(
  '/update/:jobId',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(jobValidation.updateJob),
  jobController.updateJob,
);

router.delete(
  '/delete/:jobId',
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  jobController.deleteJob,
);

router.post(
  '/:jobId/report',
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  jobController.reportJob,
);

const jobRoute = router;
export default jobRoute;
