/**
 * PM2 Ecosystem Configuration
 * Production-grade process management with clustering
 * 
 * Features:
 * - Multi-core CPU utilization via clustering
 * - Automatic process restart on failure
 * - Memory limit protection
 * - Log rotation for disk space management
 * - Zero-downtime reload
 * - Environment-specific configurations
 */

module.exports = {
  apps: [{
    // Application name
    name: "rankbaaz-api",
    
    // Entry point
    script: "./src/server.js",
    
    // Interpreter (use node for ES modules)
    interpreter: "node",
    
    // Interpreter arguments (enable ES modules)
    interpreter_args: "",
    
    // Execution mode: cluster for multi-core, fork for single process
    exec_mode: "cluster",
    
    // Number of instances
    // "max" = use all CPU cores
    // Or specify a number: 2, 4, etc.
    instances: "max",
    
    // Auto restart configuration
    autorestart: true,
    watch: false, // Disable in production (use CI/CD instead)
    max_memory_restart: "1G", // Restart if memory exceeds 1GB
    
    // Environment variables for production
    env_production: {
      NODE_ENV: "production",
      PORT: 5000,
    },
    
    // Environment variables for development
    env_development: {
      NODE_ENV: "development",
      PORT: 5000,
    },
    
    // Error handling
    min_uptime: "10s", // Consider app unstable if crashes within 10s
    max_restarts: 10, // Max restart attempts before giving up
    restart_delay: 4000, // Wait 4s before restart
    
    // Logging configuration
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_file: "./logs/pm2-combined.log",
    time: true, // Prefix logs with timestamp
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    
    // Log rotation to prevent disk overflow
    merge_logs: true,
    max_log_size: "10M",
    
    // Process management
    kill_timeout: 5000, // Wait 5s for graceful shutdown before force kill
    listen_timeout: 3000, // Wait 3s for app to bind to port
    shutdown_with_message: true,
    
    // Advanced features
    instance_var: "INSTANCE_ID", // Expose instance ID as env variable
    
    // Graceful reload (zero-downtime deployment)
    wait_ready: true, // Wait for process.send('ready') before considering app started
    
    // Cron restart (optional: restart at specific times)
    // cron_restart: "0 3 * * *", // Restart daily at 3 AM
  }],
  
  /**
   * Deployment configuration (optional)
   * Automate deployment to production/staging servers
   */
  deploy: {
    production: {
      user: "deploy",
      host: "your-server.com",
      ref: "origin/main",
      repo: "git@github.com:your-repo/rankbaaz-backend.git",
      path: "/var/www/rankbaaz-api",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-deploy-local": "echo 'Deploying to production...'"
    },
    staging: {
      user: "deploy",
      host: "staging-server.com",
      ref: "origin/develop",
      repo: "git@github.com:your-repo/rankbaaz-backend.git",
      path: "/var/www/rankbaaz-api-staging",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env development",
    }
  }
};