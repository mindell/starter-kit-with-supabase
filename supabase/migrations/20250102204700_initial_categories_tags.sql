-- Initial categories
INSERT INTO public.categories (name, slug, description)
VALUES
  ('Technology', 'technology', 'Articles about software, hardware, and tech trends'),
  ('Development', 'development', 'Programming tutorials and best practices'),
  ('Design', 'design', 'UI/UX design principles and trends'),
  ('Business', 'business', 'Business strategies and insights'),
  ('Tutorial', 'tutorial', 'Step-by-step guides and how-tos')
ON CONFLICT (slug) DO NOTHING;

-- Initial tags
INSERT INTO public.tags (name, slug, description)
VALUES
  ('JavaScript', 'javascript', 'JavaScript programming language'),
  ('React', 'react', 'React.js framework'),
  ('Next.js', 'nextjs', 'Next.js framework'),
  ('TypeScript', 'typescript', 'TypeScript programming language'),
  ('UI', 'ui', 'User Interface'),
  ('UX', 'ux', 'User Experience'),
  ('API', 'api', 'Application Programming Interface'),
  ('Database', 'database', 'Database systems and design'),
  ('Security', 'security', 'Security best practices'),
  ('Performance', 'performance', 'Application performance')
ON CONFLICT (slug) DO NOTHING;
