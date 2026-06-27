import prisma from '../config/prisma.js';

const CONFIG_TYPES = ['AUTHENTICITY_CARD', 'BARCODE_LABEL', 'SALE_ORDER', 'DISPATCH_NOTE'];
const LEGACY_TYPE_MAP = { LENS_SPECIFICATION: 'AUTHENTICITY_CARD' };

export class PrinterConfigService {

  async getAll() {
    const rows = await prisma.printerConfig.findMany({
      orderBy: { config_type: 'asc' },
    });
    // Always return all types — fill missing ones with defaults; merge legacy keys
    return CONFIG_TYPES.map((type) => {
      const found = rows.find((r) => r.config_type === type)
        ?? rows.find((r) => LEGACY_TYPE_MAP[r.config_type] === type);
      return found ?? { config_type: type, printer_name: null, paper_size: null, label_width: null, label_height: null, extra_config: null };
    });
  }

  async upsert(data, userId) {
    let { config_type, printer_name, paper_size, label_width, label_height, extra_config } = data;
    if (LEGACY_TYPE_MAP[config_type]) config_type = LEGACY_TYPE_MAP[config_type];
    if (!CONFIG_TYPES.includes(config_type)) {
      const { APIError } = await import('../middleware/errorHandler.js');
      throw new APIError(`Invalid config_type. Must be one of: ${CONFIG_TYPES.join(', ')}`, 400, 'INVALID_TYPE');
    }
    return prisma.printerConfig.upsert({
      where:  { config_type },
      update: { printer_name: printer_name || null, paper_size: paper_size || null, label_width: label_width || null, label_height: label_height || null, extra_config: extra_config || null, updatedBy: userId },
      create: { config_type, printer_name: printer_name || null, paper_size: paper_size || null, label_width: label_width || null, label_height: label_height || null, extra_config: extra_config || null, updatedBy: userId },
    });
  }
}

export default PrinterConfigService;
