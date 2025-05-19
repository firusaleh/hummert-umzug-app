// tests/controllers/umzug.controller.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const UmzugController = require('../../controllers/umzug.controller.fixed');
const Umzug = require('../../models/umzug.model');
const Aufnahme = require('../../models/aufnahme.model');
const Benachrichtigung = require('../../models/benachrichtigung.model');

describe('UmzugController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'testUserId', name: 'Test User' },
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

  describe('getAllUmzuege', () => {
    it('should return all Umzüge with pagination', async () => {
      const mockUmzuege = [
        { _id: '1', kundennummer: 'K001', status: 'geplant' },
        { _id: '2', kundennummer: 'K002', status: 'bestaetigt' }
      ];

      const findStub = sinon.stub().returns({
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves(mockUmzuege)
      });

      sinon.stub(Umzug, 'find').returns(findStub());
      sinon.stub(Umzug, 'countDocuments').resolves(2);

      await UmzugController.getAllUmzuege(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.data).to.have.lengthOf(2);
      expect(response.data.pagination.total).to.equal(2);
    });

    it('should filter by status', async () => {
      req.query.status = 'geplant';

      const findStub = sinon.stub().returns({
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([])
      });

      const findSpy = sinon.stub(Umzug, 'find').returns(findStub());
      sinon.stub(Umzug, 'countDocuments').resolves(0);

      await UmzugController.getAllUmzuege(req, res);

      expect(findSpy.calledWith(sinon.match({ status: 'geplant' }))).to.be.true;
    });

    it('should handle search query', async () => {
      req.query.search = 'test';

      const findStub = sinon.stub().returns({
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([])
      });

      const findSpy = sinon.stub(Umzug, 'find').returns(findStub());
      sinon.stub(Umzug, 'countDocuments').resolves(0);

      await UmzugController.getAllUmzuege(req, res);

      const filter = findSpy.firstCall.args[0];
      expect(filter.$or).to.exist;
      expect(filter.$or).to.have.lengthOf(2);
    });
  });

  describe('getUmzugById', () => {
    it('should return Umzug by ID', async () => {
      const mockUmzug = {
        _id: 'umzugId',
        kundennummer: 'K001',
        status: 'geplant'
      };

      req.params.id = 'umzugId';

      const findByIdStub = sinon.stub().returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves(mockUmzug)
      });

      sinon.stub(Umzug, 'findById').returns(findByIdStub());

      await UmzugController.getUmzugById(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.umzug).to.deep.equal(mockUmzug);
    });

    it('should return 404 if Umzug not found', async () => {
      req.params.id = 'nonExistentId';

      const findByIdStub = sinon.stub().returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves(null)
      });

      sinon.stub(Umzug, 'findById').returns(findByIdStub());

      await UmzugController.getUmzugById(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('not found');
    });
  });

  describe('createUmzug', () => {
    beforeEach(() => {
      req.body = {
        kundennummer: 'K001',
        auftraggeber: { name: 'Test Client' },
        startDatum: '2024-01-15',
        endDatum: '2024-01-16',
        status: 'geplant',
        preis: {
          netto: 1000,
          brutto: 1190,
          mwst: 19
        }
      };
    });

    it('should create new Umzug successfully', async () => {
      const mockUmzug = {
        _id: 'newUmzugId',
        ...req.body,
        save: sinon.stub().resolves(),
        populate: sinon.stub().returnsThis()
      };

      sinon.stub(Umzug.prototype, 'save').resolves(mockUmzug);
      sinon.stub(UmzugController, 'handleValidationErrors').returns(null);
      sinon.stub(UmzugController, 'cleanUmzugData').returns(req.body);

      await UmzugController.createUmzug(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('created successfully');
    });

    it('should validate aufnahmeId if provided', async () => {
      req.body.aufnahmeId = 'aufnahmeId';

      sinon.stub(Aufnahme, 'findById').resolves(null);
      sinon.stub(UmzugController, 'handleValidationErrors').returns(null);
      sinon.stub(UmzugController, 'cleanUmzugData').returns(req.body);

      await UmzugController.createUmzug(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('does not exist');
    });
  });

  describe('updateUmzug', () => {
    beforeEach(() => {
      req.params.id = 'umzugId';
      req.body = {
        status: 'bestaetigt',
        preis: {
          netto: 1200,
          brutto: 1428,
          mwst: 19
        }
      };
    });

    it('should update Umzug successfully', async () => {
      const mockUmzug = {
        _id: 'umzugId',
        status: 'geplant',
        save: sinon.stub().resolves(),
        populate: sinon.stub().returnsThis()
      };

      sinon.stub(Umzug, 'findById').resolves(mockUmzug);
      sinon.stub(UmzugController, 'handleValidationErrors').returns(null);
      sinon.stub(UmzugController, 'cleanUmzugData').returns(req.body);

      await UmzugController.updateUmzug(req, res);

      expect(mockUmzug.status).to.equal('bestaetigt');
      expect(mockUmzug.save.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('updated successfully');
    });

    it('should return 404 if Umzug not found', async () => {
      sinon.stub(Umzug, 'findById').resolves(null);
      sinon.stub(UmzugController, 'handleValidationErrors').returns(null);

      await UmzugController.updateUmzug(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('not found');
    });
  });

  describe('deleteUmzug', () => {
    it('should delete Umzug and associated notifications', async () => {
      req.params.id = 'umzugId';

      const mockUmzug = {
        _id: 'umzugId',
        deleteOne: sinon.stub().resolves()
      };

      sinon.stub(Umzug, 'findById').resolves(mockUmzug);
      sinon.stub(Benachrichtigung, 'deleteMany').resolves();
      sinon.stub(UmzugController, 'withTransaction').callsFake(async (callback) => {
        return callback({});
      });

      await UmzugController.deleteUmzug(req, res);

      expect(mockUmzug.deleteOne.calledOnce).to.be.true;
      expect(Benachrichtigung.deleteMany.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('deleted successfully');
    });

    it('should return 404 if Umzug not found', async () => {
      req.params.id = 'nonExistentId';

      sinon.stub(Umzug, 'findById').resolves(null);

      await UmzugController.deleteUmzug(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('not found');
    });
  });

  describe('addTask', () => {
    beforeEach(() => {
      req.params.id = 'umzugId';
      req.body = {
        beschreibung: 'Test Task',
        faelligkeit: '2024-01-20',
        prioritaet: 'hoch',
        zugewiesen: 'userId'
      };
    });

    it('should add task successfully', async () => {
      const mockUmzug = {
        _id: 'umzugId',
        tasks: [],
        save: sinon.stub().resolves()
      };

      sinon.stub(Umzug, 'findById').resolves(mockUmzug);
      sinon.stub(Benachrichtigung, 'create').resolves();
      sinon.stub(UmzugController, 'handleValidationErrors').returns(null);

      await UmzugController.addTask(req, res);

      expect(mockUmzug.tasks).to.have.lengthOf(1);
      expect(mockUmzug.tasks[0].beschreibung).to.equal('Test Task');
      expect(mockUmzug.save.calledOnce).to.be.true;
      expect(Benachrichtigung.create.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('added successfully');
    });

    it('should not create notification if not assigned', async () => {
      delete req.body.zugewiesen;

      const mockUmzug = {
        _id: 'umzugId',
        tasks: [],
        save: sinon.stub().resolves()
      };

      sinon.stub(Umzug, 'findById').resolves(mockUmzug);
      const notificationStub = sinon.stub(Benachrichtigung, 'create');
      sinon.stub(UmzugController, 'handleValidationErrors').returns(null);

      await UmzugController.addTask(req, res);

      expect(notificationStub.called).to.be.false;
    });
  });

  describe('getStatistics', () => {
    it('should return Umzug statistics', async () => {
      const mockStats = [
        { status: 'geplant', count: 5, totalValue: 5000 },
        { status: 'bestaetigt', count: 3, totalValue: 3000 }
      ];

      sinon.stub(Umzug, 'aggregate').resolves(mockStats);
      sinon.stub(Umzug, 'countDocuments')
        .onFirstCall().resolves(10)
        .onSecondCall().resolves(4);

      await UmzugController.getStatistics(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.data.statistics).to.deep.equal(mockStats);
      expect(response.data.total).to.equal(10);
      expect(response.data.upcoming).to.equal(4);
    });
  });

  describe('cleanUmzugData', () => {
    it('should clean and format Umzug data correctly', () => {
      const inputData = {
        aufnahmeId: '',
        fahrzeuge: [{ _id: '1', typ: 'LKW' }],
        mitarbeiter: [{ mitarbeiterId: 'userId' }, { mitarbeiterId: null }],
        startDatum: '2024-01-15',
        preis: {
          netto: '1000',
          brutto: '1190',
          mwst: '19'
        }
      };

      const cleanedData = UmzugController.cleanUmzugData(inputData);

      expect(cleanedData.aufnahmeId).to.be.undefined;
      expect(cleanedData.fahrzeuge[0]._id).to.be.undefined;
      expect(cleanedData.mitarbeiter).to.have.lengthOf(1);
      expect(cleanedData.startDatum).to.be.instanceof(Date);
      expect(cleanedData.preis.netto).to.equal(1000);
      expect(cleanedData.preis.brutto).to.equal(1190);
    });
  });
});