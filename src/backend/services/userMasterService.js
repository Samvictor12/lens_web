import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";
import bcrypt from "bcrypt";

/**
 * User Master Service
 * Handles all database operations for User Master management
 */
export class UserMasterService {
  /**
   * Hash password for secure storage
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Create a new user master
   * @param {Object} userData - User master data
   * @returns {Promise<Object>} Created user master
   */
  async createUserMaster(userData) {
    try {
      // Check if email or usercode already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: userData.email }, { usercode: userData.usercode }],
        },
      });

      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
        if (existingUser.usercode === userData.usercode) {
          throw new APIError(
            "User code already exists",
            409,
            "DUPLICATE_USER_CODE"
          );
        }
      }

      // Create the user master WITHOUT login credentials
      // Login credentials will be set separately via enableLogin API
      const userMaster = await prisma.user.create({
        data: {
          name: userData.name,
          usercode: userData.usercode,
          email: userData.email,
          username: `user_${userData.usercode}`, // Temporary unique username
          password: await this.hashPassword("TEMP_PASSWORD_" + Date.now()), // Temporary password
          is_login: false, // Login not enabled by default
          phonenumber: userData.phonenumber,
          alternatenumber: userData.alternatenumber,
          bloodgroup: userData.bloodgroup,
          address: userData.address,
          city: userData.city,
          state: userData.state,
          pincode: userData.pincode,
          role_id: userData.role_id,
          department_id: userData.department_id,
          salary: userData.salary,
          active_status: userData.active_status,
          delete_status: userData.delete_status || false,
          createdBy: userData.createdBy,
        },
        include: {
          role: {
            select: { id: true, name: true },
          },
          departmentDetails: {
            select: { id: true, department: true },
          },
        },
      });

      // Remove password from response
      const { password, ...userResponse } = userMaster;
      return userResponse;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error creating user master:", error);
      throw new APIError(
        "Failed to create user master",
        500,
        "CREATE_USER_ERROR"
      );
    }
  }

  /**
   * Get paginated list of user masters with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated user masters list
   */
  async getUserMasters(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        ...filters
      } = queryParams;

      // Build where clause for filtering
      const where = {};

      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: "insensitive",
        };
      }

      if (filters.usercode) {
        where.usercode = {
          contains: filters.usercode,
          mode: "insensitive",
        };
      }

      if (filters.email) {
        where.email = {
          contains: filters.email,
          mode: "insensitive",
        };
      }

      if (filters.phonenumber) {
        where.phonenumber = {
          contains: filters.phonenumber,
        };
      }

      if (filters.city) {
        where.city = {
          contains: filters.city,
          mode: "insensitive",
        };
      }

      if (filters.roleId) {
        where.roleId = filters.roleId;
      }

      if (filters.department_id) {
        where.department_id = filters.department_id;
      }

      if (filters.active_status !== undefined) {
        where.active_status = filters.active_status;
      }

      // Always filter out deleted records unless specifically requested
      if (!filters.includeDeleted) {
        where.delete_status = false;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const total = await prisma.user.count({ where });

            // Get user masters with pagination
      const userMasters = await prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          phonenumber: true,
          alternatenumber: true,
          bloodgroup: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          salary: true,
          department_id: true,
          active_status: true,
          delete_status: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true },
          },
          departmentDetails: {
            select: { id: true, department: true },
          },
          // Exclude password from select
        },
      });

      // Calculate pagination info
      const pages = Math.ceil(total / limit);

      return {
        data: userMasters,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      console.error("Error fetching user masters:", error);
      throw new APIError(
        "Failed to fetch user masters",
        500,
        "FETCH_USERS_ERROR"
      );
    }
  }

  /**
   * Get user master by ID
   * @param {number} id - User master ID
   * @returns {Promise<Object>} User master details
   */
  async getUserMasterById(id) {
    try {
      const userMaster = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          phonenumber: true,
          alternatenumber: true,
          bloodgroup: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          salary: true,
          department_id: true,
          active_status: true,
          delete_status: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true },
          },
          departmentDetails: {
            select: { id: true, department: true },
          },
          // Exclude password from select
        },
      });

      if (!userMaster) {
        throw new APIError(
          "User master not found",
          404,
          "USER_MASTER_NOT_FOUND"
        );
      }

      return userMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching user master by ID:", error);
      throw new APIError(
        "Failed to fetch user master",
        500,
        "FETCH_USER_ERROR"
      );
    }
  }

  /**
   * Update user master
   * @param {number} id - User master ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user master
   */
  async updateUserMaster(id, updateData) {
    try {
      // Check if user master exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new APIError(
          "User master not found",
          404,
          "USER_MASTER_NOT_FOUND"
        );
      }

      // Check for duplicate email or usercode if being updated
      if (updateData.email || updateData.usercode) {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            OR: [
              updateData.email && updateData.email !== existingUser.email
                ? { email: updateData.email }
                : null,
              updateData.usercode &&
              updateData.usercode !== existingUser.usercode
                ? { usercode: updateData.usercode }
                : null,
            ].filter(Boolean),
            id: { not: id },
          },
        });

        if (duplicateUser) {
          if (duplicateUser.email === updateData.email) {
            throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
          }
          if (duplicateUser.usercode === updateData.usercode) {
            throw new APIError(
              "User code already exists",
              409,
              "DUPLICATE_USER_CODE"
            );
          }
        }
      }

      // Password updates are handled via enableLogin and updateLogin endpoints only
      // Remove password from updateData if present
      delete updateData.password;

      // Update the user master
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          phonenumber: true,
          alternatenumber: true,
          bloodgroup: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          salary: true,
          department_id: true,
          active_status: true,
          delete_status: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true },
          },
          departmentDetails: {
            select: { id: true, department: true },
          },
          // Exclude password from select
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating user master:", error);
      throw new APIError(
        "Failed to update user master",
        500,
        "UPDATE_USER_ERROR"
      );
    }
  }

  /**
   * Delete user master (soft delete)
   * @param {number} id - User master ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteUserMaster(id, updatedBy) {
    try {
      // Check if user master exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              customerUserCreate: true,
              vendorUserCreate: true,
            },
          },
        },
      });

      if (!existingUser) {
        throw new APIError(
          "User master not found",
          404,
          "USER_MASTER_NOT_FOUND"
        );
      }

      if (existingUser.delete_status) {
        throw new APIError(
          "User is already deleted",
          400,
          "USER_ALREADY_DELETED"
        );
      }

      // Check if user has created any customers or vendors
      if (
        existingUser._count.customerUserCreate > 0 ||
        existingUser._count.vendorUserCreate > 0
      ) {
        throw new APIError(
          "Cannot delete user who has created customers or vendors",
          400,
          "USER_HAS_RECORDS"
        );
      }

      // Soft delete the user master
      await prisma.user.update({
        where: { id },
        data: {
          delete_status: true,
          active_status: false,
          updatedBy: updatedBy,
        },
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error deleting user master:", error);
      throw new APIError(
        "Failed to delete user master",
        500,
        "DELETE_USER_ERROR"
      );
    }
  }

  /**
   * Check if user email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} Whether email exists
   */
  async isUserEmailExists(email, excludeId = null) {
    try {
      const where = { email };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingUser = await prisma.user.findFirst({ where });
      return !!existingUser;
    } catch (error) {
      console.error("Error checking user email:", error);
      return false;
    }
  }

  /**
   * Check if user code exists
   * @param {string} usercode - User code to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} Whether user code exists
   */
  async isUserCodeExists(usercode, excludeId = null) {
    try {
      const where = { usercode };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingUser = await prisma.user.findFirst({ where });
      return !!existingUser;
    } catch (error) {
      console.error("Error checking user code:", error);
      return false;
    }
  }

  /**
   * Get user master dropdown list (for forms)
   * @returns {Promise<Array>} Simple user list for dropdowns
   */
  async getUserDropdown() {
    try {
      const users = await prisma.user.findMany({
        where: {
          active_status: true,
          delete_status: false,
        },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          role: {
            select: { name: true },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return users.map((user) => ({
        id: user.id,
        label: `${user.name} (${user.usercode})${
          user.role ? ` - ${user.role.name}` : ""
        }`,
        value: user.id,
        usercode: user.usercode,
        email: user.email,
        role: user.role?.name,
      }));
    } catch (error) {
      console.error("Error fetching user dropdown:", error);
      throw new APIError(
        "Failed to fetch user dropdown",
        500,
        "FETCH_DROPDOWN_ERROR"
      );
    }
  }

  /**
   * Get roles dropdown
   * @returns {Promise<Array>} List of roles for dropdown
   */
  async getRolesDropdown() {
    try {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return roles.map((role) => ({
        id: role.id,
        label: role.name,
        value: role.id,
      }));
    } catch (error) {
      console.error("Error fetching roles dropdown:", error);
      throw new APIError(
        "Failed to fetch roles dropdown",
        500,
        "FETCH_ROLES_ERROR"
      );
    }
  }

  /**
   * Get departments dropdown
   * @returns {Promise<Array>} List of departments for dropdown
   */
  async getDepartmentsDropdown() {
    try {
      const departments = await prisma.departmentDetails.findMany({
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
        label: dept.department,
        value: dept.id,
      }));
    } catch (error) {
      console.error("Error fetching departments dropdown:", error);
      throw new APIError(
        "Failed to fetch departments dropdown",
        500,
        "FETCH_DEPARTMENTS_ERROR"
      );
    }
  }

  /**
   * Enable login for a user (First time setup)
   * @param {number} id - User ID
   * @param {Object} loginData - Login credentials (username, password, is_login)
   * @returns {Promise<Object>} Updated user
   */
  async enableLogin(id, loginData) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new APIError("User not found", 404, "USER_NOT_FOUND");
      }

      // Check if login credentials already exist (username is set and not a temp one)
      const hasLoginCredentials = existingUser.username && 
                                  existingUser.username.trim() !== '' &&
                                  !existingUser.username.startsWith('user_');
      
      if (hasLoginCredentials) {
        throw new APIError(
          "Login credentials already exist for this user. Use update-login endpoint instead.",
          400,
          "LOGIN_ALREADY_ENABLED"
        );
      }

      // Check if username already exists
      const duplicateUsername = await prisma.user.findFirst({
        where: {
          username: loginData.username,
          id: { not: id },
        },
      });

      if (duplicateUsername) {
        throw new APIError(
          "Username already exists",
          409,
          "DUPLICATE_USERNAME"
        );
      }

      // Hash the password
      const hashedPassword = await this.hashPassword(loginData.password);

      // Enable login
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          username: loginData.username,
          password: hashedPassword,
          is_login:
            loginData.is_login !== undefined ? loginData.is_login : true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          username: true,
          is_login: true,
          phonenumber: true,
          alternatenumber: true,
          bloodgroup: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          salary: true,
          department_id: true,
          active_status: true,
          role: {
            select: { id: true, name: true },
          },
          departmentDetails: {
            select: { id: true, department: true },
          },
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error enabling login:", error);
      throw new APIError("Failed to enable login", 500, "ENABLE_LOGIN_ERROR");
    }
  }

  /**
   * Update login credentials for a user
   * @param {number} id - User ID
   * @param {Object} loginData - Updated login data (username, password, is_login - all optional)
   * @returns {Promise<Object>} Updated user
   */
  async updateLogin(id, loginData) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new APIError("User not found", 404, "USER_NOT_FOUND");
      }

      // Check if login credentials exist (username is set and not a temp one)
      const hasLoginCredentials = existingUser.username && 
                                  existingUser.username.trim() !== '' &&
                                  !existingUser.username.startsWith('user_');
      
      if (!hasLoginCredentials) {
        throw new APIError(
          "Login credentials do not exist for this user. Use enable-login endpoint first.",
          400,
          "LOGIN_NOT_ENABLED"
        );
      }

      // Prepare update data
      const updateData = {};

      // Check for duplicate username if being updated
      if (loginData.username && loginData.username !== existingUser.username) {
        const duplicateUsername = await prisma.user.findFirst({
          where: {
            username: loginData.username,
            id: { not: id },
          },
        });

        if (duplicateUsername) {
          throw new APIError(
            "Username already exists",
            409,
            "DUPLICATE_USERNAME"
          );
        }
        updateData.username = loginData.username;
      }

      // Hash password if being updated (only if a new password is provided)
      if (loginData.password && loginData.password.trim() !== '') {
        // Check if the new password is different from the existing one
        const isSamePassword = await bcrypt.compare(loginData.password, existingUser.password);
        
        if (!isSamePassword) {
          updateData.password = await this.hashPassword(loginData.password);
        }
        // If same password, don't update it (no need to rehash)
      }

      // Update is_login if provided
      if (loginData.is_login !== undefined) {
        updateData.is_login = loginData.is_login;
      }

      // Update timestamp
      updateData.updatedAt = new Date();

      // Update login credentials
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          username: true,
          is_login: true,
          phonenumber: true,
          alternatenumber: true,
          bloodgroup: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          salary: true,
          department_id: true,
          active_status: true,
          role: {
            select: { id: true, name: true },
          },
          departmentDetails: {
            select: { id: true, department: true },
          },
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating login:", error);
      throw new APIError("Failed to update login", 500, "UPDATE_LOGIN_ERROR");
    }
  }

  /**
   * Get login credentials for a user
   * @param {number} id - User ID
   * @returns {Promise<Object>} User login credentials
   */
  async getLoginCredentials(id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          username: true,
          is_login: true,
          // Password is never returned for security
        },
      });

      if (!user) {
        throw new APIError("User not found", 404, "USER_NOT_FOUND");
      }

      return user;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching login credentials:", error);
      throw new APIError(
        "Failed to fetch login credentials",
        500,
        "FETCH_LOGIN_ERROR"
      );
    }
  }

  /**
   * Get sales persons dropdown (users from Sales department)
   * @returns {Promise<Array>} List of sales persons for dropdown
   */
  async getSalesPersonsDropdown() {
    try {
      const salesPersons = await prisma.user.findMany({
        where: {
          active_status: true,
          delete_status: false,
          departmentDetails: {
            department: "Sales",
            active_status: true,
            delete_status: false,
          },
        },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          departmentDetails: {
            select: {
              id: true,
              department: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return salesPersons.map((user) => ({
        id: user.id,
        label: `${user.name} (${user.usercode})`,
        value: user.id,
        name: user.name,
        usercode: user.usercode,
        email: user.email,
        department: user.departmentDetails?.department,
      }));
    } catch (error) {
      console.error("Error fetching sales persons dropdown:", error);
      throw new APIError(
        "Failed to fetch sales persons dropdown",
        500,
        "FETCH_SALES_PERSONS_ERROR"
      );
    }
  }

  /**
   * Get delivery persons dropdown (users from Delivery department)
   * @returns {Promise<Array>} List of delivery persons for dropdown
   */
  async getDeliveryPersonsDropdown() {
    try {
      const deliveryPersons = await prisma.user.findMany({
        where: {
          active_status: true,
          delete_status: false,
          departmentDetails: {
            department: "Delivery",
            active_status: true,
            delete_status: false,
          },
        },
        select: {
          id: true,
          name: true,
          usercode: true,
          email: true,
          departmentDetails: {
            select: {
              id: true,
              department: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return deliveryPersons.map((user) => ({
        id: user.id,
        label: `${user.name} (${user.usercode})`,
        value: user.id,
        name: user.name,
        usercode: user.usercode,
        email: user.email,
        department: user.departmentDetails?.department,
      }));
    } catch (error) {
      console.error("Error fetching delivery persons dropdown:", error);
      throw new APIError(
        "Failed to fetch delivery persons dropdown",
        500,
        "FETCH_DELIVERY_PERSONS_ERROR"
      );
    }
  }
}

export default UserMasterService;
