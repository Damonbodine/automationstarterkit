UPDATE users
SET
  google_access_token = NULL,
  google_refresh_token = NULL
WHERE
  email = 'damonbodine@gmail.com';
