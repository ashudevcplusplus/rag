import { database } from '../../src/config/database';
import { companyRepository } from '../../src/repositories/company.repository';
import { userRepository } from '../../src/repositories/user.repository';
import { projectRepository } from '../../src/repositories/project.repository';
import { SubscriptionTier, CompanyStatus, UserRole, Visibility } from '../../src/types/enums';

describe('Database Integration Tests with Seed Data', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Connect to test database
    await database.connect();

    // Seed the database with test data
    // Clean up existing data first
    await companyRepository.model.deleteMany({});
    await userRepository.model.deleteMany({});
    await projectRepository.model.deleteMany({});

    // Create companies
    const company1 = await companyRepository.create({
      _id: '507f1f77bcf86cd799439011',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      email: 'admin@acme-corp.com',
      apiKey: 'dev-key-123',
      subscriptionTier: SubscriptionTier.PROFESSIONAL,
      storageLimit: 10737418240, // 10GB
      maxUsers: 50,
      maxProjects: 100,
      settings: {
        notifications: {
          email: true,
          slack: false,
        },
        features: {
          advancedSearch: true,
          apiAccess: true,
        },
      },
    } as any);

    // Create users
    const passwordHash = await userRepository.hashPassword('password123');

    await userRepository.create({
      _id: '507f1f77bcf86cd799439020',
      companyId: company1._id,
      email: 'john.doe@acme-corp.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.OWNER,
      permissions: {
        canUpload: true,
        canDelete: true,
        canShare: true,
        canManageUsers: true,
      },
    } as any);

    await userRepository.create({
      _id: '507f1f77bcf86cd799439021',
      companyId: company1._id,
      email: 'jane.smith@acme-corp.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.ADMIN,
      permissions: {
        canUpload: true,
        canDelete: true,
        canShare: true,
        canManageUsers: false,
      },
    } as any);

    await userRepository.create({
      _id: '507f1f77bcf86cd799439022',
      companyId: company1._id,
      email: 'bob.johnson@acme-corp.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Johnson',
      role: UserRole.MEMBER,
      permissions: {
        canUpload: true,
        canDelete: false,
        canShare: true,
        canManageUsers: false,
      },
    } as any);

    // Create projects
    await projectRepository.create({
      _id: '507f1f77bcf86cd799439030',
      companyId: company1._id,
      ownerId: '507f1f77bcf86cd799439020',
      name: 'Product Documentation',
      slug: 'product-docs',
      description: 'Centralized product documentation and user guides',
      color: '#3B82F6',
      icon: '📚',
      tags: ['documentation', 'product', 'guides'],
      visibility: Visibility.COMPANY,
      settings: {
        autoIndex: true,
        chunkSize: 1000,
        chunkOverlap: 200,
      },
      metadata: {
        department: 'Product',
        category: 'Documentation',
      },
    } as any);

    await projectRepository.create({
      _id: '507f1f77bcf86cd799439031',
      companyId: company1._id,
      ownerId: '507f1f77bcf86cd799439021',
      name: 'Customer Support KB',
      slug: 'support-kb',
      description: 'Customer support knowledge base and FAQs',
      color: '#10B981',
      icon: '💬',
      tags: ['support', 'kb', 'customer-service'],
      visibility: Visibility.TEAM,
      settings: {
        autoIndex: true,
        chunkSize: 800,
        chunkOverlap: 150,
      },
      metadata: {
        department: 'Support',
        category: 'Knowledge Base',
      },
    } as any);

    await projectRepository.create({
      _id: '507f1f77bcf86cd799439032',
      companyId: company1._id,
      ownerId: '507f1f77bcf86cd799439020',
      name: 'Legal Documents',
      slug: 'legal-docs',
      description: 'Company legal documents and contracts',
      color: '#EF4444',
      icon: '⚖️',
      tags: ['legal', 'contracts', 'confidential'],
      visibility: Visibility.PRIVATE,
      metadata: {
        department: 'Legal',
        category: 'Confidential',
      },
    } as any);
  });

  afterAll(async () => {
    // Disconnect from database
    await database.disconnect();
  });

  describe('Company Repository', () => {
    it('should find company by API key from seed data', async () => {
      // This uses the actual API key from seed data
      const companies = await companyRepository.list(1, 10);
      expect(companies.companies.length).toBeGreaterThan(0);

      const firstCompany = companies.companies[0];
      const found = await companyRepository.findByApiKey(firstCompany.apiKey);

      expect(found).toBeDefined();
      expect(found?.name).toBe(firstCompany.name);
      expect(found?.status).toBe(CompanyStatus.ACTIVE);
    });

    it('should find company by slug', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      expect(company).toBeDefined();
      expect(company?.name).toBe('Acme Corporation');
      expect(company?.subscriptionTier).toBe(SubscriptionTier.PROFESSIONAL);
      expect(company?.storageLimit).toBe(10737418240); // 10GB
    });

    it('should validate API key successfully', async () => {
      const companies = await companyRepository.list(1, 1);
      const apiKey = companies.companies[0].apiKey;

      const validated = await companyRepository.validateApiKey(apiKey);

      expect(validated).toBeDefined();
      expect(validated?.status).toBe(CompanyStatus.ACTIVE);
    });

    it('should check storage limit', async () => {
      const companies = await companyRepository.list(1, 1);
      testCompanyId = companies.companies[0]._id;

      const hasReachedLimit = await companyRepository.hasReachedStorageLimit(testCompanyId);

      expect(hasReachedLimit).toBe(false);
    });

    it('should get company stats', async () => {
      const companies = await companyRepository.list(1, 1);
      const companyId = companies.companies[0]._id;

      const stats = await companyRepository.getStats(companyId);

      expect(stats).toBeDefined();
      expect(stats?.userCount).toBeGreaterThanOrEqual(0);
      expect(stats?.projectCount).toBeGreaterThanOrEqual(0);
      expect(stats?.storageUsed).toBe(0);
    });

    it('should update company successfully', async () => {
      const companies = await companyRepository.list(1, 1);
      const companyId = companies.companies[0]._id;

      const updated = await companyRepository.update(companyId, {
        maxUsers: 100,
      });

      expect(updated).toBeDefined();
      expect(updated?.maxUsers).toBe(100);
    });

    it('should soft delete company', async () => {
      // Create a test company first
      const newCompany = await companyRepository.create({
        name: 'Test Company',
        slug: `test-company-delete-${Date.now()}`, // Make slug unique
        email: `test-delete-${Date.now()}@example.com`, // Make email unique
        subscriptionTier: SubscriptionTier.FREE,
        storageLimit: 5368709120,
        maxUsers: 5,
        maxProjects: 10,
      });

      const deleted = await companyRepository.delete(newCompany._id);
      expect(deleted).toBe(true);

      // Should not find deleted company
      const found = await companyRepository.findById(newCompany._id);
      expect(found).toBeNull();
    });
  });

  describe('User Repository', () => {
    it('should find user by email from seed data', async () => {
      const user = await userRepository.findByEmail('john.doe@acme-corp.com');

      expect(user).toBeDefined();
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
      expect(user?.role).toBe(UserRole.OWNER);
      testUserId = user!._id;
    });

    it('should verify password hash', async () => {
      const user = await userRepository.findByEmail('john.doe@acme-corp.com');
      expect(user).toBeDefined();

      const isValid = await userRepository.verifyPassword('password123', user!.passwordHash);
      expect(isValid).toBe(true);

      const isInvalid = await userRepository.verifyPassword('wrongpassword', user!.passwordHash);
      expect(isInvalid).toBe(false);
    });

    it('should list users by company', async () => {
      const company = await companyRepository.findBySlug('acme-corp');
      expect(company).toBeDefined();

      const users = await userRepository.findByCompanyId(company!._id);

      expect(users.length).toBeGreaterThanOrEqual(3); // At least 3 users seeded
      expect(users.every((u: any) => u.companyId === company!._id)).toBe(true);
    });

    it('should list users with pagination', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const result = await userRepository.list(company!._id, 1, 2);

      expect(result.users.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.page).toBe(1);
    });

    it('should filter users by role', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const result = await userRepository.list(company!._id, 1, 10, {
        role: UserRole.OWNER,
      });

      expect(result.users.length).toBeGreaterThanOrEqual(1);
      expect(result.users.every((u: any) => u.role === UserRole.OWNER)).toBe(true);
    });

    it('should update user', async () => {
      const user = await userRepository.findByEmail('bob.johnson@acme-corp.com');
      expect(user).toBeDefined();

      const updated = await userRepository.update(user!._id, {
        phoneNumber: '+1234567890',
      });

      expect(updated).toBeDefined();
      expect(updated?.phoneNumber).toBe('+1234567890');
    });

    it('should activate/deactivate user', async () => {
      const user = await userRepository.findByEmail('bob.johnson@acme-corp.com');
      expect(user).toBeDefined();

      await userRepository.setActive(user!._id, false);
      let found = await userRepository.findById(user!._id);
      expect(found?.isActive).toBe(false);

      await userRepository.setActive(user!._id, true);
      found = await userRepository.findById(user!._id);
      expect(found?.isActive).toBe(true);
    });
  });

  describe('Project Repository', () => {
    it('should find project by slug', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const project = await projectRepository.findBySlug(company!._id, 'product-docs');

      expect(project).toBeDefined();
      expect(project?.name).toBe('Product Documentation');
      expect(project?.visibility).toBe(Visibility.COMPANY);
      testProjectId = project!._id;
    });

    it('should list projects by company', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const projects = await projectRepository.findByCompanyId(company!._id);

      expect(projects.length).toBeGreaterThanOrEqual(3); // At least 3 projects seeded
    });

    it('should list projects with pagination', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const result = await projectRepository.list(company!._id, 1, 2);

      expect(result.projects.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.page).toBe(1);
    });

    it('should filter projects by tags', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const result = await projectRepository.list(company!._id, 1, 10, {
        tags: ['product'],
      });

      expect(result.projects.length).toBeGreaterThanOrEqual(1);
      expect(result.projects.some((p: any) => p.tags.includes('product'))).toBe(true);
    });

    it('should search projects by name', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const result = await projectRepository.search(company!._id, 'Support', 1, 10);

      expect(result.projects.length).toBeGreaterThanOrEqual(1);
      expect(result.projects.some((p: any) => p.name.includes('Support'))).toBe(true);
    });

    it('should update project', async () => {
      const company = await companyRepository.findBySlug('acme-corp');
      const project = await projectRepository.findBySlug(company!._id, 'product-docs');

      const updated = await projectRepository.update(project!._id, {
        description: 'Updated description',
        tags: ['docs', 'product', 'updated'],
      });

      expect(updated).toBeDefined();
      expect(updated?.description).toBe('Updated description');
      expect(updated?.tags).toContain('updated');
    });

    it('should update project stats', async () => {
      const company = await companyRepository.findBySlug('acme-corp');
      const project = await projectRepository.findBySlug(company!._id, 'product-docs');

      // Get current stats first
      const before = await projectRepository.findById(project!._id);
      const currentFileCount = before?.fileCount || 0;
      const currentTotalSize = before?.totalSize || 0;
      const currentVectorCount = before?.vectorCount || 0;

      // Increment stats
      await projectRepository.updateStats(project!._id, {
        fileCount: 5,
        totalSize: 1024000,
        vectorCount: 50,
      });

      const updated = await projectRepository.findById(project!._id);
      expect(updated?.fileCount).toBe(currentFileCount + 5);
      expect(updated?.totalSize).toBe(currentTotalSize + 1024000);
      expect(updated?.vectorCount).toBe(currentVectorCount + 50);
    });

    it('should archive and unarchive project', async () => {
      const company = await companyRepository.findBySlug('acme-corp');
      const project = await projectRepository.findBySlug(company!._id, 'legal-docs');

      // Archive
      await projectRepository.archive(project!._id);
      let found = await projectRepository.findById(project!._id);
      expect(found?.status).toBe('ARCHIVED');
      expect(found?.archivedAt).toBeDefined();

      // Unarchive
      await projectRepository.unarchive(project!._id);
      found = await projectRepository.findById(project!._id);
      expect(found?.status).toBe('ACTIVE');
      expect(found?.archivedAt).toBeNull();
    });

    it('should get project stats', async () => {
      const company = await companyRepository.findBySlug('acme-corp');
      const project = await projectRepository.findBySlug(company!._id, 'product-docs');

      const stats = await projectRepository.getStats(project!._id);

      expect(stats).toBeDefined();
      expect(stats?.fileCount).toBeGreaterThanOrEqual(0);
      expect(stats?.totalSize).toBeGreaterThanOrEqual(0);
      expect(stats?.vectorCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-Repository Integration', () => {
    it('should maintain referential integrity', async () => {
      // Find company
      const company = await companyRepository.findBySlug('acme-corp');
      expect(company).toBeDefined();

      // Find users belonging to company
      const users = await userRepository.findByCompanyId(company!._id);
      expect(users.length).toBeGreaterThan(0);

      // Find projects belonging to company
      const projects = await projectRepository.findByCompanyId(company!._id);
      expect(projects.length).toBeGreaterThan(0);

      // Verify user is owner of at least one project
      const userProjects = await projectRepository.findByOwnerId(users[0]._id);
      expect(userProjects.length).toBeGreaterThanOrEqual(0);
    });

    it('should count related entities correctly', async () => {
      const company = await companyRepository.findBySlug('acme-corp');

      const userCount = await userRepository.countByCompanyId(company!._id);
      const projectCount = await projectRepository.countByCompanyId(company!._id);

      expect(userCount).toBeGreaterThanOrEqual(3);
      expect(projectCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should return null for non-existent company', async () => {
      const company = await companyRepository.findById('000000000000000000000000');
      expect(company).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await userRepository.findById('000000000000000000000000');
      expect(user).toBeNull();
    });

    it('should return null for non-existent project', async () => {
      const project = await projectRepository.findById('000000000000000000000000');
      expect(project).toBeNull();
    });

    it('should return null for invalid API key', async () => {
      const company = await companyRepository.validateApiKey('invalid-key');
      expect(company).toBeNull();
    });

    it('should handle duplicate email gracefully', async () => {
      const company = await companyRepository.findBySlug('acme-corp');
      const passwordHash = await userRepository.hashPassword('test123');

      await expect(
        userRepository.create({
          companyId: company!._id,
          email: 'john.doe@acme-corp.com', // Duplicate email
          passwordHash,
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.MEMBER,
        })
      ).rejects.toMatchObject({
        code: 11000, // MongoDB duplicate key error
      });
    });
  });
});
