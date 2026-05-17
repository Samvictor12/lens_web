import SettingsService from '../services/settingsService.js';

export class SettingsController {
  constructor() {
    this.service = new SettingsService();
  }

  // GET /api/settings/public/company — unauthenticated, returns safe public fields only
  async getPublicCompany(req, res, next) {
    try {
      const data = await this.service.getCompanySettings();
      if (!data) return res.json({ success: true, data: { companyName: '' } });
      const { companyName, logo, tagline, phone, email, website, city, state } = data;
      res.json({ success: true, data: { companyName, logo, tagline, phone, email, website, city, state } });
    } catch (err) { next(err); }
  }

  // GET /api/settings/company
  async getCompany(req, res, next) {
    try {
      const data = await this.service.getCompanySettings();
      res.json({ success: true, data: data || null });
    } catch (err) { next(err); }
  }

  // PUT /api/settings/company
  async updateCompany(req, res, next) {
    try {
      const data = await this.service.upsertCompanySettings(req.body, req.user.id);
      res.json({ success: true, data, message: 'Company settings saved.' });
    } catch (err) { next(err); }
  }

  // GET /api/settings/me
  async getProfile(req, res, next) {
    try {
      const data = await this.service.getMyProfile(req.user.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // PUT /api/settings/me
  async updateProfile(req, res, next) {
    try {
      const data = await this.service.updateMyProfile(req.user.id, req.body);
      res.json({ success: true, data, message: 'Profile updated.' });
    } catch (err) { next(err); }
  }

  // PUT /api/settings/credentials
  async updateCredentials(req, res, next) {
    try {
      const data = await this.service.updateCredentials(req.user.id, req.body);
      res.json({ success: true, data, message: data.message });
    } catch (err) { next(err); }
  }
}

export default SettingsController;
