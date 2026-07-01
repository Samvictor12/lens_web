// src/backend/controllers/roleController.js
import * as roleService from '../services/roleService.js';

export async function listRoles(req, res, next) {
  try {
    const { page, limit, search, sort_by, sort_order } = req.query;
    const result = await roleService.listRoles({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search: search || '',
      sort_by: sort_by || 'createdAt',
      sort_order: sort_order || 'desc',
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRole(req, res, next) {
  try {
    const { id } = req.params;
    const result = await roleService.getRoleById(id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function createRole(req, res, next) {
  try {
    const { role_name, permissions } = req.body;
    if (!role_name) {
      return res.status(400).json({
        success: false,
        message: 'role_name is required',
      });
    }
    const result = await roleService.createRole({ role_name, permissions });
    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role_name, permissions } = req.body;
    const result = await roleService.updateRole(id, { role_name, permissions });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteRoles(req, res, next) {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required',
      });
    }
    await roleService.deleteRoles(ids);
    return res.status(200).json({
      success: true,
      message: 'Roles deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function getRolePermissions(req, res, next) {
  try {
    const { id } = req.params;
    const result = await roleService.getRolePermissions(id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRolesDropdown(req, res, next) {
  try {
    const result = await roleService.getRolesDropdown();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
