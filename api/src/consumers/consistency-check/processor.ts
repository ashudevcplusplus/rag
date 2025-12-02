import { Job } from 'bullmq';
import {
  ConsistencyCheckJobData,
  ConsistencyCheckResult,
  CleanupOrphanedJobData,
  CheckAndFixJobData,
} from '../../types/job.types';
import { ConsistencyCheckService } from '../../services/consistency-check.service';
import { consumerChangeRepository } from '../../repositories/consumer-change.repository';
import { ChangeType, ChangeStatus } from '../../models/consumer-change.model';
import { logger } from '../../utils/logger';

export type ConsumerJobData = ConsistencyCheckJobData | CleanupOrphanedJobData | CheckAndFixJobData;
export type ConsumerJobResult =
  | ConsistencyCheckResult
  | { status: 'completed' | 'failed'; [key: string]: unknown };

export async function processConsistencyCheckJob(
  job: Job<ConsumerJobData, ConsumerJobResult>
): Promise<ConsumerJobResult> {
  const jobName = job.name;
  const { companyId, eventId } = job.data;

  logger.info('Consumer job started', {
    jobId: job.id,
    jobName,
    companyId: companyId || 'all',
    eventId,
  });

  await job.updateProgress(10);

  // Create audit log entry
  let changeRecordId: string | null = null;
  let auditLogFailed = false;
  let auditLogError: string | undefined;
  try {
    const changeRecord = await consumerChangeRepository.create({
      eventType:
        jobName === 'consistency-check'
          ? ChangeType.CONSISTENCY_CHECK
          : jobName === 'cleanup-orphaned'
            ? ChangeType.CLEANUP_ORPHANED
            : ChangeType.CONSISTENCY_CHECK, // check-and-fix will be handled separately
      status: ChangeStatus.IN_PROGRESS,
      companyId,
      eventData: {
        companyId,
        jobId: job.id,
        eventId,
        ...job.data,
      },
      metadata: {
        jobId: job.id,
        eventId,
      },
    });
    changeRecordId = changeRecord._id;

    // Update status to IN_PROGRESS
    await consumerChangeRepository.updateStatus(changeRecord._id, ChangeStatus.IN_PROGRESS);
  } catch (error) {
    auditLogFailed = true;
    auditLogError = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create audit log entry', {
      error,
      jobId: job.id,
      jobName,
      companyId: companyId || 'all',
    });
    // Continue processing but flag this in the result
  }

  try {
    let result: ConsumerJobResult;

    if (jobName === 'consistency-check') {
      result = await handleConsistencyCheck(
        job as Job<ConsistencyCheckJobData, ConsistencyCheckResult>
      );
    } else if (jobName === 'cleanup-orphaned') {
      result = await handleCleanupOrphaned(job as Job<CleanupOrphanedJobData, ConsumerJobResult>);
    } else if (jobName === 'check-and-fix') {
      result = await handleCheckAndFix(job as Job<CheckAndFixJobData, ConsumerJobResult>);
    } else {
      throw new Error(`Unknown job type: ${jobName}`);
    }

    // Update audit log with success
    if (changeRecordId) {
      await consumerChangeRepository.updateStatus(
        changeRecordId,
        ChangeStatus.COMPLETED,
        result as Record<string, unknown>
      );
    }

    await job.updateProgress(100);

    // Flag result if audit log creation failed
    if (auditLogFailed) {
      return {
        ...result,
        warnings: [`Audit log creation failed: ${auditLogError}`],
        auditLogFailed: true,
      };
    }

    return result;
  } catch (error) {
    logger.error('Consumer job failed', {
      jobId: job.id,
      jobName,
      companyId: companyId || 'all',
      error,
    });

    // Update audit log with failure
    if (changeRecordId) {
      await consumerChangeRepository.updateStatus(
        changeRecordId,
        ChangeStatus.FAILED,
        undefined,
        error instanceof Error ? error.message : String(error),
        {
          stack: error instanceof Error ? error.stack : undefined,
          jobId: job.id,
        }
      );
    }

    throw error;
  }
}

async function handleConsistencyCheck(
  job: Job<ConsistencyCheckJobData, ConsistencyCheckResult>
): Promise<ConsistencyCheckResult> {
  const { companyId } = job.data;

  await job.updateProgress(30);

  let reports;
  if (companyId) {
    const report = await ConsistencyCheckService.checkCompany(companyId);
    reports = [report];
  } else {
    reports = await ConsistencyCheckService.checkAllCompanies();
  }

  await job.updateProgress(90);

  const discrepancies = reports.map((report) => ({
    companyId: report.companyId,
    companyName: report.companyName,
    issues: report.issues,
    dbVectorCount: report.dbVectorCount,
    qdrantVectorCount: report.qdrantVectorCount,
    missingInQdrant: report.missingInQdrant,
    missingInDb: report.missingInDb,
  }));

  logger.info('Consistency check job completed', {
    jobId: job.id,
    companiesChecked: reports.length,
    totalDiscrepancies: discrepancies.filter((d) => d.issues.length > 0).length,
  });

  return {
    status: 'completed',
    companiesChecked: reports.length,
    discrepancies,
  };
}

async function handleCleanupOrphaned(
  job: Job<CleanupOrphanedJobData, ConsumerJobResult>
): Promise<ConsumerJobResult> {
  const { companyId } = job.data;

  await job.updateProgress(30);

  let cleanupResult;
  if (companyId) {
    cleanupResult = await ConsistencyCheckService.cleanupOrphanedVectors(companyId);
  } else {
    const results = await ConsistencyCheckService.cleanupAllOrphanedVectors();
    const totalVectorsDeleted = results.reduce((sum, r) => sum + r.vectorsDeleted, 0);
    const totalFilesProcessed = results.reduce((sum, r) => sum + r.filesProcessed, 0);

    cleanupResult = {
      companiesProcessed: results.length,
      totalVectorsDeleted,
      totalFilesProcessed,
      results,
    };
  }

  await job.updateProgress(90);

  logger.info('Cleanup orphaned vectors job completed', {
    jobId: job.id,
    vectorsDeleted: 'vectorsDeleted' in cleanupResult ? cleanupResult.vectorsDeleted : 'N/A',
    filesProcessed: 'filesProcessed' in cleanupResult ? cleanupResult.filesProcessed : 'N/A',
  });

  return {
    status: 'completed',
    ...cleanupResult,
  };
}

async function handleCheckAndFix(
  job: Job<CheckAndFixJobData, ConsumerJobResult>
): Promise<ConsumerJobResult> {
  const { companyId } = job.data;

  await job.updateProgress(20);

  // Step 1: Run consistency check
  let reports;
  if (companyId) {
    const report = await ConsistencyCheckService.checkCompany(companyId);
    reports = [report];
  } else {
    reports = await ConsistencyCheckService.checkAllCompanies();
  }

  await job.updateProgress(50);

  // Step 2: Cleanup orphaned vectors for companies with discrepancies
  const cleanupResults: Array<{
    companyId: string;
    companyName: string;
    orphanedFiles: string[];
    vectorsDeleted: number;
    filesProcessed: number;
  }> = [];

  for (const report of reports) {
    if (
      report.missingInDb > 0 ||
      report.issues.some((i) => i.includes('exists in Qdrant but not in DB'))
    ) {
      try {
        const cleanupResult = await ConsistencyCheckService.cleanupOrphanedVectors(
          report.companyId
        );
        cleanupResults.push(cleanupResult);
      } catch (error) {
        logger.error('Failed to cleanup orphaned vectors during check-and-fix', {
          companyId: report.companyId,
          error,
        });
      }
    }
  }

  await job.updateProgress(90);

  const totalVectorsDeleted = cleanupResults.reduce((sum, r) => sum + r.vectorsDeleted, 0);
  const totalFilesProcessed = cleanupResults.reduce((sum, r) => sum + r.filesProcessed, 0);

  logger.info('Check and fix job completed', {
    jobId: job.id,
    companiesChecked: reports.length,
    companiesFixed: cleanupResults.length,
    totalVectorsDeleted,
    totalFilesProcessed,
  });

  return {
    status: 'completed',
    companiesChecked: reports.length,
    companiesFixed: cleanupResults.length,
    totalVectorsDeleted,
    totalFilesProcessed,
    checkResults: reports.map((r) => ({
      companyId: r.companyId,
      companyName: r.companyName,
      issues: r.issues,
      dbVectorCount: r.dbVectorCount,
      qdrantVectorCount: r.qdrantVectorCount,
    })),
    cleanupResults,
  };
}
