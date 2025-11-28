import { database } from '../config/database';
import { companyRepository } from '../repositories/company.repository';
import { userRepository } from '../repositories/user.repository';
import { projectRepository } from '../repositories/project.repository';
import { logger } from '../utils/logger';
import { SubscriptionTier } from '../schemas/company.schema';
import { UserRole } from '../schemas/user.schema';
import { Visibility } from '../schemas/project.schema';

async function seed(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    // Connect to MongoDB
    await database.connect();

    // Drop existing collections to prevent duplicate key errors
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV) {
      logger.info('Cleaning up existing data...');
      await companyRepository.model.deleteMany({});
      await userRepository.model.deleteMany({});
      await projectRepository.model.deleteMany({});
    }

    // Create companies
    logger.info('Creating companies...');

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
    logger.info('Company created', { companyId: company1._id, apiKey: company1.apiKey });

    const company2 = await companyRepository.create({
      name: 'TechStart Inc',
      slug: 'techstart',
      email: 'hello@techstart.io',
      subscriptionTier: SubscriptionTier.STARTER,
      storageLimit: 5368709120, // 5GB
      maxUsers: 10,
      maxProjects: 20,
    });
    logger.info('Company created', { companyId: company2._id, apiKey: company2.apiKey });

    // Create users for company1
    logger.info('Creating users for Acme Corporation...');

    const passwordHash = await userRepository.hashPassword('password123');

    const user1 = await userRepository.create({
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
    logger.info('User created', { userId: user1._id, email: user1.email });

    const user2 = await userRepository.create({
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
    logger.info('User created', { userId: user2._id, email: user2.email });

    const user3 = await userRepository.create({
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
    logger.info('User created', { userId: user3._id, email: user3.email });

    // Create users for company2
    logger.info('Creating users for TechStart Inc...');

    const user4 = await userRepository.create({
      _id: '507f1f77bcf86cd799439023',
      companyId: company2._id,
      email: 'sarah.wilson@techstart.io',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: UserRole.OWNER,
    } as any);
    logger.info('User created', { userId: user4._id, email: user4.email });

    // Create projects for company1
    logger.info('Creating projects for Acme Corporation...');

    const project1 = await projectRepository.create({
      _id: '507f1f77bcf86cd799439030',
      companyId: company1._id,
      ownerId: user1._id,
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
    logger.info('Project created', { projectId: project1._id, slug: project1.slug });

    const project2 = await projectRepository.create({
      _id: '507f1f77bcf86cd799439031',
      companyId: company1._id,
      ownerId: user2._id,
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
    logger.info('Project created', { projectId: project2._id, slug: project2.slug });

    const project3 = await projectRepository.create({
      _id: '507f1f77bcf86cd799439032',
      companyId: company1._id,
      ownerId: user1._id,
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
    logger.info('Project created', { projectId: project3._id, slug: project3.slug });

    // Create projects for company2
    logger.info('Creating projects for TechStart Inc...');

    const project4 = await projectRepository.create({
      _id: '507f1f77bcf86cd799439033',
      companyId: company2._id,
      ownerId: user4._id,
      name: 'Engineering Docs',
      slug: 'eng-docs',
      description: 'Technical documentation and architecture docs',
      color: '#8B5CF6',
      icon: '🔧',
      tags: ['engineering', 'technical', 'architecture'],
      visibility: Visibility.COMPANY,
      settings: {
        autoIndex: true,
        chunkSize: 1200,
        chunkOverlap: 200,
      },
      metadata: {
        department: 'Engineering',
        category: 'Technical',
      },
    } as any);
    logger.info('Project created', { projectId: project4._id, slug: project4.slug });

    logger.info('✅ Database seed completed successfully!');
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('SEED DATA SUMMARY');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('Companies Created:');
    logger.info(`  1. ${company1.name} (${company1.slug})`);
    logger.info(`     API Key: ${company1.apiKey}`);
    logger.info(`     Email: ${company1.email}`);
    logger.info(`     Tier: ${company1.subscriptionTier}`);
    logger.info('');
    logger.info(`  2. ${company2.name} (${company2.slug})`);
    logger.info(`     API Key: ${company2.apiKey}`);
    logger.info(`     Email: ${company2.email}`);
    logger.info(`     Tier: ${company2.subscriptionTier}`);
    logger.info('');
    logger.info('Users Created (Password: password123):');
    logger.info(`  - ${user1.email} (${user1.role}) - Acme Corporation`);
    logger.info(`  - ${user2.email} (${user2.role}) - Acme Corporation`);
    logger.info(`  - ${user3.email} (${user3.role}) - Acme Corporation`);
    logger.info(`  - ${user4.email} (${user4.role}) - TechStart Inc`);
    logger.info('');
    logger.info('Projects Created:');
    logger.info(`  - ${project1.name} (${project1.slug}) - Acme Corporation`);
    logger.info(`  - ${project2.name} (${project2.slug}) - Acme Corporation`);
    logger.info(`  - ${project3.name} (${project3.slug}) - Acme Corporation`);
    logger.info(`  - ${project4.name} (${project4.slug}) - TechStart Inc`);
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('💡 Use the API Keys above to test the API endpoints');
    logger.info('   Example: curl -H "x-api-key: YOUR_API_KEY" http://localhost:8000/health');
    logger.info('');

    // Disconnect
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', { error });
    process.exit(1);
  }
}

// Run seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
