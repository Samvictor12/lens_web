import DepartmentService from '../services/department.service.js';

/**
 * Department Controller
 * Handles HTTP requests for Department operations
 */
export class DepartmentController {
  constructor() {
    this.departmentService = new DepartmentService();
  }

  /**
   * Create a new department
   * @route POST /api/department
   */
  async create(req, res, next) {
    try {
      const { department, active_status } = req.body;

      // Basic validation
      if (!department || department.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Department name is required'
        });
      }

      const departmentData = {
        department: department.trim(),
        active_status: active_status !== undefined ? active_status : true,
        createdBy: 1, // TODO: Get from authenticated user
        updatedBy: 1  // TODO: Get from authenticated user
      };

      const newDepartment = await this.departmentService.createDepartment(departmentData);

      res.status(201).json({
        success: true,
        data: newDepartment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of departments
   * @route GET /api/department
   */
  async list(req, res, next) {
    try {
      const result = await this.departmentService.getDepartments(req.query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single department by ID
   * @route GET /api/department/:id
   */
  async getById(req, res, next) {
    try {
      const department = await this.departmentService.getDepartmentById(req.params.id);

      res.status(200).json({
        success: true,
        data: department
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update department
   * @route PUT /api/department/:id
   */
  async update(req, res, next) {
    try {
      const { department, active_status } = req.body;

      // Basic validation
      if (!department || department.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Department name is required'
        });
      }

      const departmentData = {
        department: department.trim(),
        active_status,
        updatedBy: 1 // TODO: Get from authenticated user
      };

      const updatedDepartment = await this.departmentService.updateDepartment(
        req.params.id,
        departmentData
      );

      res.status(200).json({
        success: true,
        data: updatedDepartment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete department (soft delete)
   * @route DELETE /api/department/:id
   */
  async delete(req, res, next) {
    try {
      const updatedBy = 1; // TODO: Get from authenticated user

      await this.departmentService.deleteDepartment(
        req.params.id,
        updatedBy
      );

      res.status(200).json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dropdown list of departments
   * @route GET /api/department/dropdown
   */
  async dropdown(req, res, next) {
    try {
      const departments = await this.departmentService.getDepartmentDropdown();

      res.status(200).json({
        success: true,
        data: departments
      });
    } catch (error) {
      next(error);
    }
  }
}

export default DepartmentController;
