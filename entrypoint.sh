#!/bin/sh

# -----------------------------------------------------------------------------
# This script ensures that all required environment variables and files
# are present before starting the main application.
# -----------------------------------------------------------------------------

# 1. Check for the Google Cloud Project ID
: "${GOOGLE_CLOUD_PROJECT?Error: GOOGLE_CLOUD_PROJECT environment variable must be set.}"

# 2. Check that the path to the credentials file is set
: "${GOOGLE_APPLICATION_CREDENTIALS?Error: GOOGLE_APPLICATION_CREDENTIALS environment variable must be set.}"

# 3. Check that the credentials file actually exists at the specified path
if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "Error: The credential file specified by GOOGLE_APPLICATION_CREDENTIALS does not exist."
    echo "Path: '$GOOGLE_APPLICATION_CREDENTIALS'"
    exit 1
fi

# 4. Check for the PORT
: "${PORT?Error: PORT environment variable must be set.}"


# If all checks pass, print a success message and execute the main command.
echo "✔ Configuration checks passed. Starting application..."
exec "$@"