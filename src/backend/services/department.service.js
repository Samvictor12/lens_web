import { PrismaClient } from "@prisma/client";
import { APIError } from "../middleware/errorHandler.js";

const prisma = new PrismaClient();

/**
 * Department Service
 * Handles all database operations for Department management
 */
export class DepartmentService {
  /**
   * Create a new department
   * @param {Object} departmentData - Department data
   * @returns {Promise<Object>} Created department
   */
  async createDepartment(departmentData) {
    try {
      // Check if department name already exists
      const existingDepartment = await prisma.departmentDetails.findFirst({
        where: {
          department: departmentData.department,
          delete_status: false,
        },
      });

      if (existingDepartment) {
        throw new APIError(
          "Department name already exists",
          409,
          "DUPLICATE_DEPARTMENT_NAME"
        );
      }

      // Create the department
      const department = await prisma.departmentDetails.create({
        data: {
          department: departmentData.department,
          active_status:
            departmentData.active_status !== undefined
              ? departmentData.active_status
              : true,
          delete_status: false,
          createdBy: departmentData.createdBy,
          updatedBy: departmentData.updatedBy,
        },
      });

      return department;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error creating department:", error);
      throw new APIError(
        "Failed to create department",
        500,
        "CREATE_DEPARTMENT_ERROR"
      );
    }
  }

  /**
   * Get paginated list of departments with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated departments list
   */
  async getDepartments(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        department,
        active_status,
      } = queryParams;

      // Build where clause
      const where = {
        delete_status: false,
      };

      // Add department name search (partial match, case insensitive)
      if (department) {
        where.department = {
          contains: department,
          mode: "insensitive",
        };
      }

      // Add active status filter
      if (active_status !== undefined) {
        where.active_status =
          active_status === "true" || active_status === true;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Get total count
      const total = await prisma.departmentDetails.count({ where });

      // Get paginated data
      const departments = await prisma.departmentDetails.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
        },
      });

      return {
        data: departments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      console.error("Error fetching departments:", error);
      throw new APIError(
        "Failed to fetch departments",
        500,
        "FETCH_DEPARTMENTS_ERROR"
      );
    }
  }

  /**
   * Get single department by ID
   * @param {number} id - Department ID
   * @returns {Promise<Object>} Department data
   */
  async getDepartmentById(id) {
    try {
      const department = await prisma.departmentDetails.findUnique({
        where: { id: parseInt(id) },
      });

      if (!department || department.delete_status) {
        throw new APIError("Department not found", 404, "DEPARTMENT_NOT_FOUND");
      }

      return department;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching department:", error);
      throw new APIError(
        "Failed to fetch department",
        500,
        "FETCH_DEPARTMENT_ERROR"
      );
    }
  }

  /**
   * Update department
   * @param {number} id - Department ID
   * @param {Object} departmentData - Updated department data
   * @returns {Promise<Object>} Updated department
   */
  async updateDepartment(id, departmentData) {
    try {
      // Check if department exists
      const existingDepartment = await prisma.departmentDetails.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingDepartment || existingDepartment.delete_status) {
        throw new APIError("Department not found", 404, "DEPARTMENT_NOT_FOUND");
      }

      // Check if new name already exists (excluding current department)
      if (departmentData.department) {
        const duplicateName = await prisma.departmentDetails.findFirst({
          where: {
            department: departmentData.department,
            id: { not: parseInt(id) },
            delete_status: false,
          },
        });

        if (duplicateName) {
          throw new APIError(
            "Department name already exists",
            409,
            "DUPLICATE_DEPARTMENT_NAME"
          );
        }
      }

      // Update the department
      const updatedDepartment = await prisma.departmentDetails.update({
        where: { id: parseInt(id) },
        data: {
          department: departmentData.department,
          active_status: departmentData.active_status,
          updatedBy: departmentData.updatedBy,
        },
      });

      return updatedDepartment;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating department:", error);
      throw new APIError(
        "Failed to update department",
        500,
        "UPDATE_DEPARTMENT_ERROR"
      );
    }
  }

  /**
   * Soft delete department
   * @param {number} id - Department ID
   * @param {number} updatedBy - User ID performing the delete
   * @returns {Promise<Object>} Success response
   */
  async deleteDepartment(id, updatedBy) {
    try {
      // Check if department exists
      const existingDepartment = await prisma.departmentDetails.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingDepartment) {
        throw new APIError("Department not found", 404, "DEPARTMENT_NOT_FOUND");
      }

      if (existingDepartment.delete_status) {
        throw new APIError(
          "Department is already deleted",
          400,
          "DEPARTMENT_ALREADY_DELETED"
        );
      }

      // Check if department has users by querying the User table
      const userCount = await prisma.user.count({
        where: {
          department_id: parseInt(id),
          delete_status: false,
        },
      });

      if (userCount > 0) {
        throw new APIError(
          "Cannot delete department with assigned users",
          400,
          "DEPARTMENT_HAS_USERS"
        );
      }

      // Soft delete the department (set both flags as per requirement)
      await prisma.departmentDetails.update({
        where: { id: parseInt(id) },
        data: {
          delete_status: true,
          active_status: false,
          updatedBy,
        },
      });

      return { message: "Department deleted successfully" };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error deleting department:", error);
      throw new APIError(
        "Failed to delete department",
        500,
        "DELETE_DEPARTMENT_ERROR"
      );
    }
  }

  /**
   * Get dropdown list of active departments
   * @returns {Promise<Array>} List of active departments
   */
  async getDepartmentDropdown() {
    try {
      const departments = await prisma.departmentDetails.findMany({
        where: {
          active_status: true,
          delete_status: false,
        },
        select: {
          id: true,
          department: true,
        },
        orderBy: {
          department: "asc",
        },
      });

      return departments.map((dept) => ({
        id: dept.id,
        name: dept.department,
      }));
    } catch (error) {
      console.error("Error fetching department dropdown:", error);
      throw new APIError(
        "Failed to fetch department dropdown",
        500,
        "FETCH_DROPDOWN_ERROR"
      );
    }
  }
}

export default DepartmentService;
