// tests/controllers/auth.controller.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const AuthController = require('../../controllers/auth.controller.fixed');
const { User } = require('../../models');

describe('AuthController', () => {
  let req, res, next;
  let userStub;

  beforeEach(() => {
    req = {
      body: {},
      user: { id: 'testUserId' },
      headers: {}
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis()
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('register', () => {
    beforeEach(() => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'mitarbeiter'
      };
    });

    it('should register a new user successfully', async () => {
      const mockUser = {
        _id: 'userId',
        name: 'Test User',
        email: 'test@example.com',
        role: 'mitarbeiter',
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findOne').resolves(null);
      sinon.stub(User.prototype, 'save').resolves(mockUser);
      sinon.stub(jwt, 'sign').returns('testToken');
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.register(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.token).to.equal('testToken');
      expect(response.data.user.email).to.equal('test@example.com');
    });

    it('should return error if email already exists', async () => {
      sinon.stub(User, 'findOne').resolves({ email: 'test@example.com' });
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.register(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('already exists');
    });

    it('should handle validation errors', async () => {
      const mockError = { error: 'validation failed' };
      sinon.stub(AuthController, 'handleValidationErrors').returns(mockError);

      const result = await AuthController.register(req, res);

      expect(result).to.equal(mockError);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        _id: 'userId',
        name: 'Test User',
        email: 'test@example.com',
        role: 'mitarbeiter',
        isActive: true,
        comparePassword: sinon.stub().resolves(true),
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findOne').returns({
        select: sinon.stub().resolves(mockUser)
      });
      sinon.stub(jwt, 'sign').returns('testToken');
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.login(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.token).to.equal('testToken');
      expect(mockUser.save.calledOnce).to.be.true;
    });

    it('should return error for invalid credentials', async () => {
      sinon.stub(User, 'findOne').returns({
        select: sinon.stub().resolves(null)
      });
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.login(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });

    it('should return error for deactivated account', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'test@example.com',
        isActive: false,
        comparePassword: sinon.stub().resolves(true)
      };

      sinon.stub(User, 'findOne').returns({
        select: sinon.stub().resolves(mockUser)
      });
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.login(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('deactivated');
    });
  });

  describe('getMe', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        _id: 'userId',
        name: 'Test User',
        email: 'test@example.com',
        role: 'mitarbeiter'
      };

      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves(mockUser)
      });

      await AuthController.getMe(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.user).to.deep.equal(mockUser);
    });

    it('should return error if user not found', async () => {
      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves(null)
      });

      await AuthController.getMe(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('not found');
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      req.body = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123'
      };
    });

    it('should change password successfully', async () => {
      const mockUser = {
        _id: 'userId',
        comparePassword: sinon.stub().resolves(true),
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves(mockUser)
      });
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.changePassword(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('changed successfully');
      expect(mockUser.save.calledOnce).to.be.true;
    });

    it('should return error for incorrect current password', async () => {
      const mockUser = {
        _id: 'userId',
        comparePassword: sinon.stub().resolves(false)
      };

      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves(mockUser)
      });
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.changePassword(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('incorrect');
    });
  });

  describe('createAdmin', () => {
    beforeEach(() => {
      req.body = {
        email: 'admin@example.com',
        password: 'adminPassword',
        name: 'Admin User'
      };
      req.user = { id: 'adminId', role: 'admin' };
    });

    it('should create admin user successfully', async () => {
      const mockUser = {
        _id: 'newAdminId',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findOne').resolves(null);
      sinon.stub(User.prototype, 'save').resolves(mockUser);
      sinon.stub(jwt, 'sign').returns('adminToken');
      sinon.stub(AuthController, 'authorize').returns(null);

      await AuthController.createAdmin(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.user.role).to.equal('admin');
    });

    it('should upgrade existing user to admin', async () => {
      const mockUser = {
        _id: 'existingUserId',
        email: 'admin@example.com',
        role: 'mitarbeiter',
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findOne').resolves(mockUser);
      sinon.stub(AuthController, 'authorize').returns(null);

      await AuthController.createAdmin(req, res);

      expect(mockUser.role).to.equal('admin');
      expect(mockUser.save.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('upgraded');
    });

    it('should return error if not authorized', async () => {
      const mockError = { error: 'unauthorized' };
      sinon.stub(AuthController, 'authorize').returns(mockError);

      const result = await AuthController.createAdmin(req, res);

      expect(result).to.equal(mockError);
    });
  });

  describe('forgotPassword', () => {
    beforeEach(() => {
      req.body = { email: 'test@example.com' };
    });

    it('should handle forgot password request', async () => {
      const mockUser = {
        email: 'test@example.com',
        createPasswordResetToken: sinon.stub().returns('resetToken'),
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findOne').resolves(mockUser);
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.forgotPassword(req, res);

      expect(mockUser.createPasswordResetToken.calledOnce).to.be.true;
      expect(mockUser.save.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
    });

    it('should not reveal if user does not exist', async () => {
      sinon.stub(User, 'findOne').resolves(null);
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.forgotPassword(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('If the email exists');
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      req.body = {
        token: 'resetToken',
        newPassword: 'newPassword123'
      };
    });

    it('should reset password successfully', async () => {
      const mockUser = {
        _id: 'userId',
        name: 'Test User',
        email: 'test@example.com',
        role: 'mitarbeiter',
        password: '',
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        save: sinon.stub().resolves()
      };

      sinon.stub(User, 'findOne').resolves(mockUser);
      sinon.stub(jwt, 'sign').returns('newToken');
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.resetPassword(req, res);

      expect(mockUser.password).to.equal('newPassword123');
      expect(mockUser.passwordResetToken).to.be.undefined;
      expect(mockUser.save.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.token).to.equal('newToken');
    });

    it('should return error for invalid or expired token', async () => {
      sinon.stub(User, 'findOne').resolves(null);
      sinon.stub(AuthController, 'handleValidationErrors').returns(null);

      await AuthController.resetPassword(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('Invalid or expired');
    });
  });
});