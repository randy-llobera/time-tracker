-- TimeTracker seed data
-- PostgreSQL / Neon

-- USERS
INSERT INTO users (name)
SELECT 'Rosa'
WHERE NOT EXISTS (
  SELECT 1
  FROM users
  WHERE active = TRUE
    AND lower(name) = lower('Rosa')
);

INSERT INTO users (name)
SELECT 'Carlos'
WHERE NOT EXISTS (
  SELECT 1
  FROM users
  WHERE active = TRUE
    AND lower(name) = lower('Carlos')
);

-- EMPLOYERS
INSERT INTO employers (name)
SELECT 'Os Petiscos de Margarita'
WHERE NOT EXISTS (
  SELECT 1
  FROM employers
  WHERE active = TRUE
    AND lower(name) = lower('Os Petiscos de Margarita')
);

INSERT INTO employers (name)
SELECT 'ATISA'
WHERE NOT EXISTS (
  SELECT 1
  FROM employers
  WHERE active = TRUE
    AND lower(name) = lower('ATISA')
);