import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

const port = process.env.PORT || '6201';
const BASE_URL = `http://localhost:${port}`;
const API_URL = `${BASE_URL}/api`;

const token = jwt.sign(
  { userId: 1, email: 'admin@lens.com', username: 'system', roleId: 1 },
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-lens-project-2025',
  { expiresIn: '2h', issuer: 'lens-management', audience: 'lens-users' }
);

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
};

async function req(method, endpoint, body = null) {
  const url = `${API_URL}${endpoint}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    let data;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

const results = [];

function record(master, op, res, expectedStatus = [200, 201]) {
  const isExpected = Array.isArray(expectedStatus)
    ? expectedStatus.includes(res.status)
    : res.status === expectedStatus;
  const passed = res.ok && isExpected;
  const info = {
    master,
    operation: op,
    passed,
    status: res.status,
    message: res.data?.message || (res.data?.errors ? JSON.stringify(res.data.errors) : (res.error || 'OK'))
  };
  results.push(info);
  const mark = passed ? '✅' : '❌';
  console.log(`${mark} [${master}] ${op}: status ${res.status} (${info.message})`);
  return passed;
}

const ts = Date.now().toString().slice(-5);

async function runAllMasters() {
  console.log('====================================================');
  console.log(`🚀 STARTING MASTER DATA CRUD AUDIT - ${new Date().toISOString()}`);
  console.log(`Target: ${API_URL}`);
  console.log('====================================================\n');

  // 1. Department
  try {
    console.log('\n--- 1. Testing Departments ---');
    const c = await req('POST', '/department', { department: `QA_Dept_${ts}` });
    record('Department', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/department/${id}`);
      record('Department', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/department?limit=5');
      record('Department', 'READ_LIST', l, 200);
      const d = await req('GET', '/department/dropdown');
      record('Department', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/department/${id}`, { department: `QA_Dept_${ts}_U` });
      record('Department', 'UPDATE', u, 200);
      const del = await req('DELETE', `/department/${id}`);
      record('Department', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('Department error:', e);
  }

  // 2. Business Category
  try {
    console.log('\n--- 2. Testing Business Categories ---');
    const c = await req('POST', '/business-category', { name: `QA_Biz_${ts}` });
    record('BusinessCategory', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/business-category/${id}`);
      record('BusinessCategory', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/business-category?limit=5');
      record('BusinessCategory', 'READ_LIST', l, 200);
      const d = await req('GET', '/business-category/dropdown');
      record('BusinessCategory', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/business-category/${id}`, { name: `QA_Biz_${ts}_U` });
      record('BusinessCategory', 'UPDATE', u, 200);
      const del = await req('DELETE', `/business-category/${id}`);
      record('BusinessCategory', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('BusinessCategory error:', e);
  }

  // 3. Roles
  try {
    console.log('\n--- 3. Testing Roles ---');
    const c = await req('POST', '/roles/create', { role_name: `QA_Role_${ts}` });
    record('Role', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/roles/${id}`);
      record('Role', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/roles/list?limit=5');
      record('Role', 'READ_LIST', l, 200);
      const d = await req('GET', '/roles/dropdown');
      record('Role', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/roles/update/${id}`, { role_name: `QA_Role_${ts}_U` });
      record('Role', 'UPDATE', u, 200);
      const del = await req('DELETE', '/roles/delete', { ids: [id] });
      record('Role', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('Role error:', e);
  }

  // 4. Users
  try {
    console.log('\n--- 4. Testing Users ---');
    const c = await req('POST', '/user-master', {
      name: `QA User ${ts}`,
      usercode: `QAU${ts.slice(-6)}`,
      email: `qa_user_${ts}@test.com`,
      phonenumber: '9876543210',
      department_id: 1,
      active_status: true,
      createdBy: 1
    });
    record('User', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/user-master/${id}`);
      record('User', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/user-master?limit=5');
      record('User', 'READ_LIST', l, 200);
      const d = await req('GET', '/user-master/dropdown');
      record('User', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/user-master/${id}`, {
        name: `QA User ${ts} Updated`,
        updatedBy: 1
      });
      record('User', 'UPDATE', u, 200);
      const del = await req('DELETE', `/user-master/${id}`);
      record('User', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('User error:', e);
  }

  // 5. Customers
  try {
    console.log('\n--- 5. Testing Customers ---');
    const c = await req('POST', '/customer-master', {
      name: `QA Customer ${ts}`,
      code: `CUST_${ts.slice(-6)}`,
      phone: '9876543211',
      email: `cust_${ts}@test.com`,
      credit_limit: 50000,
      createdBy: 1
    });
    record('Customer', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/customer-master/${id}`);
      record('Customer', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/customer-master?limit=5');
      record('Customer', 'READ_LIST', l, 200);
      const d = await req('GET', '/customer-master/dropdown');
      record('Customer', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/customer-master/${id}`, {
        name: `QA Customer ${ts} Updated`,
        updatedBy: 1
      });
      record('Customer', 'UPDATE', u, 200);
      const del = await req('DELETE', `/customer-master/${id}`);
      record('Customer', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('Customer error:', e);
  }

  // 6. Vendors
  try {
    console.log('\n--- 6. Testing Vendors ---');
    const c = await req('POST', '/vendor-master', {
      name: `QA Vendor ${ts}`,
      code: `VEND_${ts.slice(-6)}`,
      email: `vend_${ts}@test.com`,
      phone: '9876543212',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      createdBy: 1
    });
    record('Vendor', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/vendor-master/${id}`);
      record('Vendor', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/vendor-master?limit=5');
      record('Vendor', 'READ_LIST', l, 200);
      const d = await req('GET', '/vendor-master/dropdown');
      record('Vendor', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/vendor-master/${id}`, {
        name: `QA Vendor ${ts} Updated`,
        updatedBy: 1
      });
      record('Vendor', 'UPDATE', u, 200);
      const del = await req('DELETE', `/vendor-master/${id}`);
      record('Vendor', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('Vendor error:', e);
  }

  // 7. Expense Categories
  try {
    console.log('\n--- 7. Testing Expense Categories ---');
    const c = await req('POST', '/expense-categories', {
      name: `QA Exp Cat ${ts}`,
      expenseType: 'INDIRECT'
    });
    record('ExpenseCategory', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/expense-categories/${id}`);
      record('ExpenseCategory', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/expense-categories');
      record('ExpenseCategory', 'READ_LIST', l, 200);
      const u = await req('PUT', `/expense-categories/${id}`, {
        name: `QA Exp Cat ${ts} Updated`
      });
      record('ExpenseCategory', 'UPDATE', u, 200);
      const del = await req('DELETE', `/expense-categories/${id}`);
      record('ExpenseCategory', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('ExpenseCategory error:', e);
  }

  // 8. Income Categories
  try {
    console.log('\n--- 8. Testing Income Categories ---');
    const c = await req('POST', '/income-categories', {
      name: `QA Inc Cat ${ts}`
    });
    record('IncomeCategory', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/income-categories/${id}`);
      record('IncomeCategory', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/income-categories');
      record('IncomeCategory', 'READ_LIST', l, 200);
      const u = await req('PUT', `/income-categories/${id}`, {
        name: `QA Inc Cat ${ts} Updated`
      });
      record('IncomeCategory', 'UPDATE', u, 200);
      const del = await req('DELETE', `/income-categories/${id}`);
      record('IncomeCategory', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('IncomeCategory error:', e);
  }

  // 9. Check Sheets
  try {
    console.log('\n--- 9. Testing Check Sheets ---');
    const c = await req('POST', '/check-sheets', {
      name: `QA CheckSheet ${ts}`,
      check_key: `CS_${ts.slice(-6)}`,
      description: 'QA CheckSheet Test',
      activeStatus: true
    });
    record('CheckSheet', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/check-sheets/${id}`);
      record('CheckSheet', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/check-sheets?limit=5');
      record('CheckSheet', 'READ_LIST', l, 200);
      const u = await req('PUT', `/check-sheets/${id}`, {
        name: `QA CheckSheet ${ts} Updated`,
        description: 'QA CheckSheet Test Updated'
      });
      record('CheckSheet', 'UPDATE', u, 200);
      const del = await req('DELETE', `/check-sheets/${id}`);
      record('CheckSheet', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('CheckSheet error:', e);
  }

  // 10. Lens Categories
  try {
    console.log('\n--- 10. Testing Lens Categories ---');
    const c = await req('POST', '/v1/lens-categories', {
      name: `QA LensCat ${ts}`,
      description: 'Test category'
    });
    record('LensCategory', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-categories/${id}`);
      record('LensCategory', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-categories?limit=5');
      record('LensCategory', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-categories/dropdown');
      record('LensCategory', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-categories/${id}`, {
        name: `QA LensCat ${ts} U`
      });
      record('LensCategory', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-categories/${id}`);
      record('LensCategory', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensCategory error:', e);
  }

  // 11. Lens Brands
  try {
    console.log('\n--- 11. Testing Lens Brands ---');
    const c = await req('POST', '/v1/lens-brands', {
      name: `QA Brand ${ts}`,
      code: `BR_${ts}`,
      description: 'Test brand'
    });
    record('LensBrand', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-brands/${id}`);
      record('LensBrand', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-brands?limit=5');
      record('LensBrand', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-brands/dropdown');
      record('LensBrand', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-brands/${id}`, {
        name: `QA Brand ${ts} U`
      });
      record('LensBrand', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-brands/${id}`);
      record('LensBrand', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensBrand error:', e);
  }

  // 12. Lens Materials
  try {
    console.log('\n--- 12. Testing Lens Materials ---');
    const c = await req('POST', '/v1/lens-materials', {
      name: `QA Mat ${ts}`,
      code: `MAT_${ts}`,
      description: 'Test mat'
    });
    record('LensMaterial', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-materials/${id}`);
      record('LensMaterial', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-materials?limit=5');
      record('LensMaterial', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-materials/dropdown');
      record('LensMaterial', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-materials/${id}`, {
        name: `QA Mat ${ts} U`
      });
      record('LensMaterial', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-materials/${id}`);
      record('LensMaterial', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensMaterial error:', e);
  }

  // 13. Lens Types
  try {
    console.log('\n--- 13. Testing Lens Types ---');
    const c = await req('POST', '/v1/lens-types', {
      name: `QA Type ${ts}`,
      code: `TYP_${ts}`,
      description: 'Test type'
    });
    record('LensType', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-types/${id}`);
      record('LensType', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-types?limit=5');
      record('LensType', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-types/dropdown');
      record('LensType', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-types/${id}`, {
        name: `QA Type ${ts} U`
      });
      record('LensType', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-types/${id}`);
      record('LensType', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensType error:', e);
  }

  // 14. Lens Indexes
  try {
    console.log('\n--- 14. Testing Lens Indexes ---');
    const c = await req('POST', '/v1/lens-indexes', {
      index_name: `1.99_${ts}`,
      description: 'Test index'
    });
    record('LensIndex', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-indexes/${id}`);
      record('LensIndex', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-indexes?limit=5');
      record('LensIndex', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-indexes/dropdown');
      record('LensIndex', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-indexes/${id}`, {
        index_name: `1.99_${ts}_U`
      });
      record('LensIndex', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-indexes/${id}`);
      record('LensIndex', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensIndex error:', e);
  }

  // 15. Lens Coatings
  try {
    console.log('\n--- 15. Testing Lens Coatings ---');
    const c = await req('POST', '/v1/lens-coatings', {
      name: `QA Coating ${ts}`,
      short_name: `QC${ts}`
    });
    record('LensCoating', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-coatings/${id}`);
      record('LensCoating', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-coatings?limit=5');
      record('LensCoating', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-coatings/dropdown');
      record('LensCoating', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-coatings/${id}`, {
        name: `QA Coating ${ts} U`,
        short_name: `QC${ts}`
      });
      record('LensCoating', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-coatings/${id}`);
      record('LensCoating', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensCoating error:', e);
  }

  // 16. Lens Tintings
  try {
    console.log('\n--- 16. Testing Lens Tintings ---');
    const c = await req('POST', '/v1/lens-tintings', {
      name: `QA Tinting ${ts}`,
      short_name: `QT${ts}`
    });
    record('LensTinting', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-tintings/${id}`);
      record('LensTinting', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-tintings?limit=5');
      record('LensTinting', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-tintings/dropdown');
      record('LensTinting', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-tintings/${id}`, {
        name: `QA Tinting ${ts} U`,
        short_name: `QT${ts}`
      });
      record('LensTinting', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-tintings/${id}`);
      record('LensTinting', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensTinting error:', e);
  }

  // 17. Lens Diameters (Lens Dia)
  try {
    console.log('\n--- 17. Testing Lens Diameters ---');
    const diaVal = 80 + Math.floor(Math.random() * 10);
    const c = await req('POST', '/lens-dias', {
      name: diaVal,
      description: 'Test Dia'
    });
    record('LensDia', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/lens-dias/${id}`);
      record('LensDia', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/lens-dias?limit=5');
      record('LensDia', 'READ_LIST', l, 200);
      const d = await req('GET', '/lens-dias/dropdown');
      record('LensDia', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/lens-dias/${id}`, {
        name: diaVal,
        description: 'Test Dia Updated'
      });
      record('LensDia', 'UPDATE', u, 200);
      const del = await req('DELETE', `/lens-dias/${id}`);
      record('LensDia', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensDia error:', e);
  }

  // 18. Lens Fittings
  try {
    console.log('\n--- 18. Testing Lens Fittings ---');
    const c = await req('POST', '/lens-fittings', {
      name: `QA Fitting ${ts}`,
      short_name: `QF${ts}`,
      fitting_price: 150
    });
    record('LensFitting', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/lens-fittings/${id}`);
      record('LensFitting', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/lens-fittings?limit=5');
      record('LensFitting', 'READ_LIST', l, 200);
      const d = await req('GET', '/lens-fittings/dropdown');
      record('LensFitting', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/lens-fittings/${id}`, {
        name: `QA Fitting ${ts} U`,
        short_name: `QF${ts}`,
        fitting_price: 180
      });
      record('LensFitting', 'UPDATE', u, 200);
      const del = await req('DELETE', `/lens-fittings/${id}`);
      record('LensFitting', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensFitting error:', e);
  }

  // 19. Lens Products
  try {
    console.log('\n--- 19. Testing Lens Products ---');
    const c = await req('POST', '/v1/lens-products', {
      product_code: `LP_${ts}`,
      lens_name: `QA Lens Product ${ts}`,
      brand_id: 2,
      category_id: 3,
      material_id: 1,
      type_id: 1,
      index_id: 1,
      sphere_min: -4,
      sphere_max: 4,
      sphere_extra_charge: 50,
      cyl_min: -2,
      cyl_max: 0,
      prices: [
        { coating_id: 1, price: 500 }
      ],
      activeStatus: true,
      createdBy: 1
    });
    record('LensProduct', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-products/${id}`);
      record('LensProduct', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-products?limit=5');
      record('LensProduct', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/lens-products/dropdown');
      record('LensProduct', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/lens-products/${id}`, {
        product_code: `LP_${ts}`,
        lens_name: `QA Lens Product ${ts} Updated`,
        brand_id: 2,
        category_id: 3,
        material_id: 1,
        type_id: 1,
        index_id: 1,
        prices: [
          { coating_id: 1, price: 650 },
          { coating_id: 6, price: 800 }
        ],
        activeStatus: true,
        updatedBy: 1
      });
      record('LensProduct', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-products/${id}`);
      record('LensProduct', 'DELETE', del, [200, 400]);
    }
  } catch (e) {
    console.error('LensProduct error:', e);
  }

  // 20. Locations
  try {
    console.log('\n--- 20. Testing Locations ---');
    const c = await req('POST', '/v1/location-master', {
      name: `QA Location ${ts}`,
      godownType: 'STOCK',
      description: 'Test Location',
      activeStatus: true
    });
    record('Location', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/location-master/${id}`);
      record('Location', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/location-master?limit=5');
      record('Location', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/location-master/dropdown');
      record('Location', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/location-master/${id}`, {
        name: `QA Location ${ts} Updated`,
        godownType: 'STOCK'
      });
      record('Location', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/location-master/${id}`);
      record('Location', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('Location error:', e);
  }

  // 21. Trays (Bins)
  try {
    console.log('\n--- 21. Testing Trays (Bins) ---');
    const trayNum = `TRY_${ts}`;
    const c = await req('POST', '/v1/tray-master', {
      name: trayNum,
      description: 'Test Tray',
      capacity: 50,
      activeStatus: true
    });
    record('Tray', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/tray-master/${id}`);
      record('Tray', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/tray-master?limit=5');
      record('Tray', 'READ_LIST', l, 200);
      const d = await req('GET', '/v1/tray-master/dropdown');
      record('Tray', 'DROPDOWN', d, 200);
      const u = await req('PUT', `/v1/tray-master/${id}`, {
        name: `${trayNum}_U`,
        capacity: 60
      });
      record('Tray', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/tray-master/${id}`);
      record('Tray', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('Tray error:', e);
  }

  // 22. Location Trays
  try {
    console.log('\n--- 22. Testing Location Trays ---');
    const loc = await req('POST', '/v1/location-master', { name: `LT_Loc_${ts}`, godownType: 'STOCK' });
    const locId = loc.data?.data?.id;

    if (locId) {
      const c = await req('POST', '/v1/location-tray-master', {
        name: `LT_Tray_${ts}`,
        location_id: locId,
        description: 'Test Location Tray',
        activeStatus: true
      });
      record('LocationTray', 'CREATE', c, 201);
      const id = c.data?.data?.id;
      if (id) {
        const r = await req('GET', `/v1/location-tray-master/${id}`);
        record('LocationTray', 'READ_DETAIL', r, 200);
        const l = await req('GET', '/v1/location-tray-master?limit=5');
        record('LocationTray', 'READ_LIST', l, 200);
        const d = await req('GET', '/v1/location-tray-master/dropdown');
        record('LocationTray', 'DROPDOWN', d, 200);
        const u = await req('PUT', `/v1/location-tray-master/${id}`, {
          name: `LT_Tray_${ts}_U`,
          location_id: locId,
          activeStatus: false
        });
        record('LocationTray', 'UPDATE', u, 200);
        const del = await req('DELETE', `/v1/location-tray-master/${id}`);
        record('LocationTray', 'DELETE', del, 200);
      }
      await req('DELETE', `/v1/location-master/${locId}`);
    }
  } catch (e) {
    console.error('LocationTray error:', e);
  }

  // 23. Lens Offers
  try {
    console.log('\n--- 23. Testing Lens Offers ---');
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 86400000 * 30).toISOString();
    const c = await req('POST', '/v1/lens-offers', {
      offerName: `QA Offer ${ts}`,
      offerType: 'VALUE',
      discountValue: 100,
      lens_id: 1,
      coating_id: 6,
      startDate: start,
      endDate: end,
      activeStatus: true
    });
    record('LensOffer', 'CREATE', c, 201);
    const id = c.data?.data?.id;
    if (id) {
      const r = await req('GET', `/v1/lens-offers/${id}`);
      record('LensOffer', 'READ_DETAIL', r, 200);
      const l = await req('GET', '/v1/lens-offers?limit=5');
      record('LensOffer', 'READ_LIST', l, 200);
      const u = await req('PUT', `/v1/lens-offers/${id}`, {
        offerName: `QA Offer ${ts} Updated`,
        offerType: 'VALUE',
        discountValue: 120,
        startDate: start,
        endDate: end
      });
      record('LensOffer', 'UPDATE', u, 200);
      const del = await req('DELETE', `/v1/lens-offers/${id}`);
      record('LensOffer', 'DELETE', del, 200);
    }
  } catch (e) {
    console.error('LensOffer error:', e);
  }

  // Summary
  console.log('\n====================================================');
  console.log('📊 MASTER CRUD AUDIT SUMMARY');
  console.log('====================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total Operations Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\n❌ FAILED OPERATIONS:');
    results.filter(r => !r.passed).forEach(f => {
      console.log(` - [${f.master}] ${f.operation}: status ${f.status} -> ${f.message}`);
    });
  } else {
    console.log('\n🎉 ALL MASTER CRUD OPERATIONS PASSED SUCCESSFULLY!');
  }
}

runAllMasters().catch(console.error);
