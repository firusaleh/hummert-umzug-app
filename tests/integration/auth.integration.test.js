// tests/integration/auth.integration.test.js
const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/user');

describe('Auth API Integration Tests', () => {
  let server;
  let authToken;

  before((done) => {
    // Start server and connect to test database
    server = app.listen(0, () => {
      const { port } = server.address();
      console.log(`Test server started on port ${port}`);
      done();
    });
  });

  after(async () => {
    // Clean up and close connections
    await User.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const res = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(res.body.success).to.be.true;
      expect(res.body.data.user.email).to.equal(userData.email);
      expect(res.body.data.token).to.exist;

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).to.exist;
      expect(user.name).to.equal(userData.name);
    });

    it('should not register user with existing email', async () => {
      // Create existing user
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      });

      const userData = {
        name: 'New User',
        email: 'existing@example.com',
        password: 'password456'
      };

      const res = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('already exists');
    });

    it('should validate required fields', async () => {
      const userData = {
        name: 'Test User'
        // Missing email and password
      };

      const res = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.exist;
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'mitarbeiter'
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const res = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data.user.email).to.equal(loginData.email);
      expect(res.body.data.token).to.exist;

      authToken = res.body.data.token;
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const res = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal('Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const res = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    let user;

    beforeEach(async () => {
      // Create and login test user
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'mitarbeiter'
      });

      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      authToken = loginRes.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data.user.email).to.equal(user.email);
      expect(res.body.data.user.password).to.not.exist;
    });

    it('should not get profile without token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).to.be.false;
    });

    it('should not get profile with invalid token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body.success).to.be.false;
    });
  });

  describe('PUT /api/auth/change-password', () => {
    beforeEach(async () => {
      // Create and login test user
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'oldpassword123',
        role: 'mitarbeiter'
      });

      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'oldpassword123' });

      authToken = loginRes.body.data.token;
    });

    it('should change password with correct current password', async () => {
      const passwordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      const res = await request(server)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include('changed successfully');

      // Verify can login with new password
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'newpassword456' })
        .expect(200);

      expect(loginRes.body.success).to.be.true;
    });

    it('should not change password with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456'
      };

      const res = await request(server)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(401);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('incorrect');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle forgot password request', async () => {
      const res = await request(server)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include('reset link');

      // In development, token URL is returned
      if (process.env.NODE_ENV === 'development') {
        expect(res.body.data.resetUrl).to.exist;
      }
    });

    it('should not reveal if email does not exist', async () => {
      const res = await request(server)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include('If the email exists');
    });
  });

  describe('POST /api/auth/create-admin', () => {
    let adminToken;

    beforeEach(async () => {
      // Create admin user
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'adminpassword',
        role: 'admin'
      });

      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'adminpassword' });

      adminToken = loginRes.body.data.token;
    });

    it('should create admin user when authorized', async () => {
      const adminData = {
        name: 'New Admin',
        email: 'newadmin@example.com',
        password: 'adminpassword123'
      };

      const res = await request(server)
        .post('/api/auth/create-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adminData)
        .expect(201);

      expect(res.body.success).to.be.true;
      expect(res.body.data.user.role).to.equal('admin');

      // Verify admin was created
      const newAdmin = await User.findOne({ email: adminData.email });
      expect(newAdmin).to.exist;
      expect(newAdmin.role).to.equal('admin');
    });

    it('should upgrade existing user to admin', async () => {
      // Create regular user
      await User.create({
        name: 'Regular User',
        email: 'regular@example.com',
        password: 'password123',
        role: 'mitarbeiter'
      });

      const adminData = {
        email: 'regular@example.com',
        password: 'password123'
      };

      const res = await request(server)
        .post('/api/auth/create-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adminData)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include('upgraded');

      // Verify user was upgraded
      const upgradedUser = await User.findOne({ email: adminData.email });
      expect(upgradedUser.role).to.equal('admin');
    });

    it('should not create admin when not authorized', async () => {
      // Login as regular user
      await User.create({
        name: 'Regular User',
        email: 'regular@example.com',
        password: 'password123',
        role: 'mitarbeiter'
      });

      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: 'regular@example.com', password: 'password123' });

      const regularToken = loginRes.body.data.token;

      const adminData = {
        name: 'New Admin',
        email: 'newadmin@example.com',
        password: 'adminpassword123'
      };

      const res = await request(server)
        .post('/api/auth/create-admin')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(adminData)
        .expect(403);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Insufficient permissions');
    });
  });
});