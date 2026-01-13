const express = require('express');
const { createEmployee, getEmployees, toggleEmployeeStatus } = require('../controllers/usercontroller');
const { isAuthenticated } = require('../middlewares/auth');
const authorizeRoles = require('../middlewares/role');

const router = express.Router();

router.use(isAuthenticated);
router.use(authorizeRoles('SUPER_ADMIN'));

router.route('/')
  .post(createEmployee)
  .get(getEmployees);

router.patch('/:id/status', toggleEmployeeStatus);

module.exports = router;
