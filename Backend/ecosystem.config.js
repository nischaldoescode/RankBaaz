/**
 * pm2 ecosystem configuration
 * production-grade process management with clustering
 *
 * features:
 * - multi-core cpu utilization via clustering
 * - automatic process restart on failure
 * - memory limit protection
 * - log rotation for disk space management
 * - zero-downtime reload
 * - environment-specific configurations
 */

module.exports = {
  apps: [{
    // application name
    name: "rankbaaz-api",

    // entry point
    script: "./src/server.js",

    // interpreter (use node for es modules)
    interpreter: "node",

    // interpreter arguments (enable es modules)
    interpreter_args: "",

    // execution mode: cluster for multi-core, fork for single process
    exec_mode: "cluster",

    // number of instances
    // "max" = use all cpu cores
    // or specify a number: 2, 4, etc.
    instances: "max",

    // auto restart configuration
    autorestart: true,
    watch: false, // disable in production (use ci/cd instead)
    max_memory_restart: "1G", // restart if memory exceeds 1gb

    // environment variables for production
    env_production: {
      NODE_ENV: "production",
      PORT: 5000,
    },

    // environment variables for development
    env_development: {
      NODE_ENV: "development",
      PORT: 5000,
    },

    // error handling
    min_uptime: "10s", // consider app unstable if crashes within 10s
    max_restarts: 10, // max restart attempts giving up
    restart_delay: 4000, // wait 4s restart

    // logging configuration
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_file: "./logs/pm2-combined.log",
    time: true, // prefix logs with timestamp
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",

    // log rotation to prevent disk overflow
    merge_logs: true,
    max_log_size: "10M",

    // process management
    kill_timeout: 5000, // wait 5s for graceful shutdown force kill
    listen_timeout: 3000, // wait 3s for app to bind to port
    shutdown_with_message: true,

    // advanced features
    instance_var: "INSTANCE_ID", // expose instance id as env variable

    // graceful reload (zero-downtime deployment)
    wait_ready: true, // wait for process.send('ready') considering app started

    // cron restart (optional: restart at specific times)
    // cron_restart: "0 3 * * *", // restart daily at 3 am
  }],

  /**
   * deployment configuration (optional)
   * automate deployment to production/staging servers
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