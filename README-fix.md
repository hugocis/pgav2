# Fix for Docker Container Errors

## Problems Fixed

1. **EACCES Permission Error**: The error occurs because the `nextjs` user in the Docker container is created with a default home directory at `/nonexistent`, which the user doesn't have permission to write to. When npm commands are run (including those for Prisma), they attempt to create files in this directory, resulting in a permission error.

2. **Missing Prisma Schema**: After fixing the permission issue, Prisma couldn't find the schema.prisma file because it wasn't properly copied to the production Docker image.

3. **Missing ts-node for Seeding**: The seeding process failed because ts-node wasn't available in the production Docker image, giving an ENOENT error.

## Changes Made

1. **Modified Dockerfile**:
   - Created a proper home directory for the `nextjs` user at `/home/nextjs`
   - Added explicit permissions for the npm cache directory
   - Added explicit copying of the Prisma schema and migration files to the production image
   - Ensured package.json is included in the production image (required for Prisma)
   - Added global installation of ts-node and typescript for seeding
   - Added copying of node_modules and tsconfig.json to support the seeding process

2. **Updated `init-db.sh`**:
   - Ensured proper HOME directory environment variable is set when running npm commands
   - Added directory creation with correct permissions
   - Added verification of schema.prisma file location
   - Added explicit schema path to Prisma commands
   - Added ts-node verification and fallback installation for seeding

3. **Updated `restart-docker.ps1`**:
   - Added `--no-cache` flag to force complete rebuilding of the images

## How to Apply the Fix

1. Run the restart script to rebuild the Docker containers with the changes:

```powershell
.\restart-docker.ps1
```

This will:
- Stop existing containers
- Rebuild the containers with no cache (to ensure all changes are applied)
- Start the containers again

2. If you encounter any issues, you can check the logs:

```powershell
docker-compose logs -f
```

## Explanation

The key issue was that npm was trying to create temporary files and directories in the home directory of the user running the process (`/nonexistent` for the `nextjs` user). By providing a proper home directory and ensuring it has the correct permissions, npm can now create these files without permission errors.
