// Excel import/export utilities for customer data
// Note: This is a basic implementation. For production, consider using libraries like:
// - xlsx (SheetJS) for full Excel support
// - papaparse for CSV operations

/**
 * Download a sample Excel template for customer import
 */
export const downloadCustomerTemplate = () => {
  const headers = [
    "Customer Code",
    "Customer Name",
    "Shop Name",
    "Phone",
    "Alternate Phone",
    "Email",
    "Address",
    "GST Number",
    "Credit Limit",
  ];

  const sampleData = [
    [
      "CUST001",
      "Raj Opticals",
      "Raj's Vision Center",
      "+91 98765 43210",
      "+91 98765 43211",
      "contact@rajopticals.com",
      "123 MG Road, Mumbai, Maharashtra 400001",
      "27AABCU9603R1Z5",
      "30010",
    ],
    [
      "CUST002",
      "Vision Plus",
      "Vision Plus Optics",
      "+91 98765 43212",
      "",
      "info@visionplus.com",
      "456 Park Street, Kolkata, West Bengal 700016",
      "19AABCV5678M1Z4",
      "73001",
    ],
  ];

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "customer_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export customers data to Excel/CSV
 */
export const exportCustomersToExcel = (customers) => {
  const headers = [
    "Customer Code",
    "Customer Name",
    "Shop Name",
    "Phone",
    "Alternate Phone",
    "Email",
    "Address",
    "GST Number",
    "Credit Limit",
    "Outstanding Balance",
  ];

  const data = customers.map((customer) => [
    customer.customerCode || "",
    customer.name || "",
    customer.shopName || "",
    customer.phone || "",
    customer.alternatephone || "",
    customer.email || "",
    customer.address || "",
    customer.gstNumber || "",
    customer.creditLimit || "",
    customer.outstandingBalance || "0",
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...data.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `customers_export_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse CSV content to array
 */
const parseCSV = (content) => {
  const lines = content.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser - handles quoted fields
    const fields = [];
    let currentField = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = "";
      } else {
        currentField += char;
      }
    }
    // Push last field
    fields.push(currentField);
    result.push(fields);
  }

  return result;
};

/**
 * Import customers from Excel/CSV file
 */
export const importCustomersFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const rows = parseCSV(content);

        if (rows.length < 2) {
          reject(new Error("File is empty or has no data rows"));
          return;
        }

        // Skip header row
        const dataRows = rows.slice(1);

        const customers = dataRows
          .filter((row) => row.some((cell) => cell.trim())) // Skip empty rows
          .map((row, index) => {
            // Validate required fields
            if (!row[0]?.trim() || !row[1]?.trim() || !row[3]?.trim()) {
              throw new Error(
                `Row ${index + 2}: Customer Code, Name, and Phone are required fields`
              );
            }

            return {
              customerCode: row[0]?.trim() || "",
              name: row[1]?.trim() || "",
              shopName: row[2]?.trim() || "",
              phone: row[3]?.trim() || "",
              alternatephone: row[4]?.trim() || "",
              email: row[5]?.trim() || "",
              address: row[6]?.trim() || "",
              gstNumber: row[7]?.trim() || "",
              creditLimit: row[8]?.trim() || "",
            };
          });

        resolve(customers);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    // Read as text for CSV
    reader.readAsText(file);
  });
};

/**
 * Validate imported customer data
 */
export const validateCustomerData = (customer) => {
  const errors = [];

  // Phone validation
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  if (!phoneRegex.test(customer.phone.replace(/\s/g, ""))) {
    errors.push("Invalid phone number format");
  }

  // Email validation (if provided)
  if (customer.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      errors.push("Invalid email format");
    }
  }

  // GST validation (if provided)
  if (customer.gstNumber) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(customer.gstNumber)) {
      errors.push("Invalid GST number format");
    }
  }

  return errors;
};

/**
 * Download a sample Excel template for vendor import
 */
export const downloadVendorTemplate = () => {
  const headers = [
    "Vendor Code",
    "Vendor Name",
    "Shop Name",
    "Phone",
    "Email",
    "Address",
    "City",
    "State",
    "Pincode",
    "Category",
    "GST Number",
    "Remarks",
  ];

  const sampleData = [
    [
      "VEND001",
      "Essilor India",
      "Essilor Manufacturing",
      "+91 98765 43210",
      "contact@essilor.in",
      "123 Industrial Area, Mumbai",
      "Mumbai",
      "Maharashtra",
      "400001",
      "Lens Manufacturer",
      "27AABCE1234M1Z5",
      "Premium lens supplier",
    ],
    [
      "VEND002",
      "Ray-Ban Frames",
      "Ray-Ban Distribution",
      "+91 98765 43212",
      "info@rayban.in",
      "456 Commercial Street, Bangalore",
      "Bangalore",
      "Karnataka",
      "560001",
      "Frame Supplier",
      "29AABCR5678N1Z4",
      "Authorized distributor",
    ],
  ];

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "vendor_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export vendors data to Excel/CSV
 */
export const exportVendorsToExcel = (vendors) => {
  const headers = [
    "Vendor Code",
    "Vendor Name",
    "Shop Name",
    "Phone",
    "Email",
    "Address",
    "City",
    "State",
    "Pincode",
    "Category",
    "GST Number",
    "Remarks",
    "Status",
  ];

  const rows = vendors.map((vendor) => [
    vendor.vendorCode || "",
    vendor.name || "",
    vendor.shopName || "",
    vendor.phone || "",
    vendor.email || "",
    vendor.address || "",
    vendor.city || "",
    vendor.state || "",
    vendor.pincode || "",
    vendor.category || "",
    vendor.gstNumber || "",
    vendor.remarks || "",
    vendor.activeStatus ? "Active" : "Inactive",
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `vendors_export_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Import vendors from Excel/CSV file
 */
export const importVendorsFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error("File is empty or contains no data rows");
        }

        // Parse CSV
        const parseCSVLine = (line) => {
          const result = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        // Skip header row
        const dataLines = lines.slice(1);

        const vendors = dataLines.map((line, index) => {
          const values = parseCSVLine(line);

          if (values.length < 5) {
            throw new Error(`Invalid data format at row ${index + 2}`);
          }

          return {
            vendorCode: values[0] || "",
            name: values[1] || "",
            shopName: values[2] || "",
            phone: values[3] || "",
            email: values[4] || "",
            address: values[5] || "",
            city: values[6] || "",
            state: values[7] || "",
            pincode: values[8] || "",
            category: values[9] || "",
            gstNumber: values[10] || "",
            remarks: values[11] || "",
            activeStatus: values[12]?.toLowerCase() !== "inactive",
          };
        });

        resolve(vendors);
      } catch (error) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
};
