const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function deployHandsonlaborWebsite() {
  console.log('🚀 Starting Handsonlabor Website Rebuild and Deployment...\n');

  const websiteDir = path.join(process.cwd(), 'handsonlabor-website');
  
  try {
    // Check if website directory exists
    if (!fs.existsSync(websiteDir)) {
      throw new Error('handsonlabor-website directory not found');
    }

    console.log('📋 Pre-deployment checks...');
    
    // Check if required tools are available
    try {
      execSync('gcloud --version', { stdio: 'pipe' });
      console.log('✅ Google Cloud CLI available');
    } catch (error) {
      throw new Error('Google Cloud CLI not found. Please install it first.');
    }

    try {
      execSync('docker --version', { stdio: 'pipe' });
      console.log('✅ Docker available');
    } catch (error) {
      throw new Error('Docker not found. Please install it first.');
    }

    // Change to website directory
    process.chdir(websiteDir);
    console.log(`📁 Changed to directory: ${websiteDir}`);

    // Clean previous builds
    console.log('\n🧹 Cleaning previous builds...');
    try {
      if (fs.existsSync('.next')) {
        execSync('rm -rf .next', { stdio: 'inherit' });
      }
      if (fs.existsSync('node_modules/.cache')) {
        execSync('rm -rf node_modules/.cache', { stdio: 'inherit' });
      }
      console.log('✅ Previous builds cleaned');
    } catch (error) {
      console.log('⚠️  Could not clean previous builds (continuing anyway)');
    }

    // Install/update dependencies
    console.log('\n📦 Installing dependencies...');
    execSync('npm ci', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');

    // Run build
    console.log('\n🏗️  Building Next.js application...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');

    // Verify build output
    console.log('\n📋 Verifying build output...');
    if (!fs.existsSync('.next/standalone')) {
      throw new Error('Standalone build output not found. Check next.config.js');
    }
    console.log('✅ Standalone build output verified');

    // Set up Google Cloud configuration
    console.log('\n🔧 Setting up Google Cloud configuration...');
    const projectId = 'handsonlabor';
    const serviceName = 'handsonlabor-website';
    const region = 'us-central1';
    const repository = 'cloud-run-source-deploy';
    
    // Set project
    execSync(`gcloud config set project ${projectId}`, { stdio: 'inherit' });
    console.log(`✅ Project set to ${projectId}`);

    // Enable required APIs
    console.log('\n🔧 Enabling required Google Cloud APIs...');
    execSync('gcloud services enable cloudbuild.googleapis.com', { stdio: 'inherit' });
    execSync('gcloud services enable run.googleapis.com', { stdio: 'inherit' });
    execSync('gcloud services enable artifactregistry.googleapis.com', { stdio: 'inherit' });
    console.log('✅ APIs enabled');

    // Configure Docker authentication
    console.log('\n🐳 Configuring Docker authentication...');
    execSync('gcloud auth configure-docker us-central1-docker.pkg.dev', { stdio: 'inherit' });
    console.log('✅ Docker authentication configured');

    // Build Docker image
    console.log('\n🐳 Building Docker image...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const imageName = `us-central1-docker.pkg.dev/${projectId}/${repository}/${serviceName}:${timestamp}`;
    
    execSync(`docker build -t ${imageName} .`, { stdio: 'inherit' });
    console.log(`✅ Docker image built: ${imageName}`);

    // Push Docker image
    console.log('\n📤 Pushing Docker image to Artifact Registry...');
    execSync(`docker push ${imageName}`, { stdio: 'inherit' });
    console.log('✅ Docker image pushed successfully');

    // Deploy to Cloud Run
    console.log('\n🚀 Deploying to Cloud Run...');
    const deployCommand = `
      gcloud run deploy ${serviceName} \\
        --image ${imageName} \\
        --platform managed \\
        --region ${region} \\
        --allow-unauthenticated \\
        --port 3000 \\
        --memory 512Mi \\
        --cpu 1 \\
        --min-instances 0 \\
        --max-instances 3 \\
        --timeout 300 \\
        --concurrency 80 \\
        --set-env-vars "NODE_ENV=production" \\
        --set-env-vars "NEXT_TELEMETRY_DISABLED=1"
    `.replace(/\s+/g, ' ').trim();

    execSync(deployCommand, { stdio: 'inherit' });
    console.log('✅ Deployment to Cloud Run completed');

    // Get service URL
    console.log('\n🌐 Getting service URL...');
    const serviceUrl = execSync(
      `gcloud run services describe ${serviceName} --platform managed --region ${region} --format 'value(status.url)'`,
      { encoding: 'utf8' }
    ).trim();

    console.log('\n🎉 Deployment completed successfully!');
    console.log(`🌐 Website URL: ${serviceUrl}`);
    
    // Display useful information
    console.log('\n📊 Deployment Summary:');
    console.log(`  📋 Project: ${projectId}`);
    console.log(`  📋 Service: ${serviceName}`);
    console.log(`  📋 Region: ${region}`);
    console.log(`  📋 Image: ${imageName}`);
    console.log(`  📋 URL: ${serviceUrl}`);

    console.log('\n📝 Useful commands:');
    console.log(`  View logs: gcloud run services logs tail ${serviceName} --region ${region}`);
    console.log(`  Update service: gcloud run services update ${serviceName} --region ${region}`);
    console.log(`  Delete service: gcloud run services delete ${serviceName} --region ${region}`);

    console.log('\n✅ Handsonlabor Website deployment completed successfully!');
    
    return {
      success: true,
      serviceUrl,
      imageName,
      serviceName,
      region
    };

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    
    if (error.stdout) {
      console.error('Command output:', error.stdout.toString());
    }
    
    if (error.stderr) {
      console.error('Command errors:', error.stderr.toString());
    }

    console.log('\n🔧 Troubleshooting steps:');
    console.log('  1. Ensure Google Cloud CLI is authenticated: gcloud auth login');
    console.log('  2. Verify Docker is running');
    console.log('  3. Check Google Cloud project permissions');
    console.log('  4. Verify Artifact Registry repository exists');
    console.log('  5. Check build logs for specific errors');

    throw error;
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  deployHandsonlaborWebsite()
    .then((result) => {
      console.log('\n🚀 Deployment script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deployment script failed!');
      process.exit(1);
    });
}

module.exports = { deployHandsonlaborWebsite };
