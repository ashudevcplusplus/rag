import { database } from './src/config/database';
import { EmbeddingModel } from './src/models/embedding.model';
import { logger } from './src/utils/logger';

async function checkEmbeddings() {
  try {
    await database.connect();
    console.log('Connected to MongoDB.');

    const count = await EmbeddingModel.countDocuments();
    console.log(`\nTotal Embeddings in DB: ${count}`);

    if (count > 0) {
      const sample = await EmbeddingModel.findOne().sort({ createdAt: -1 }).lean();
      console.log('\nSample Embedding (Latest):');
      console.log('--------------------------------------------------');
      console.log(`ID: ${sample?._id}`);
      console.log(`FileID: ${sample?.fileId}`);
      console.log(`Chunk Index: ${sample?.chunkIndex}`);
      console.log(`Content Preview: "${sample?.content.substring(0, 100)}..."`);
      console.log(`Vector Length: ${sample?.vector.length}`);
      console.log(`Created At: ${sample?.createdAt}`);
      console.log('--------------------------------------------------');
    } else {
      console.log('\nNo embeddings found. Run E2E tests to generate data.');
    }

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error checking embeddings:', error);
    process.exit(1);
  }
}

checkEmbeddings();

