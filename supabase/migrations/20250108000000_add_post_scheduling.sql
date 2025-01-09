-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA cron;

-- Create improved function to auto-publish scheduled posts
CREATE OR REPLACE FUNCTION handle_scheduled_posts()
RETURNS trigger AS $$
BEGIN
  -- If post is scheduled and schedule time has passed, publish it
  IF NEW.status = 'scheduled' AND NEW.scheduled_at <= NOW() THEN
    NEW.status := 'published';
    NEW.published_at := NEW.scheduled_at;
    NEW.scheduled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle scheduled posts
CREATE TRIGGER handle_scheduled_posts_trigger
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_scheduled_posts();

-- Create a scheduled job to publish posts (runs every minute)
-- This is a backup mechanism in case the trigger misses any posts
SELECT cron.schedule(
  'publish-scheduled-posts',
  '* * * * *',
  $$
  UPDATE posts 
  SET 
    status = 'published',
    published_at = scheduled_at,
    scheduled_at = NULL
  WHERE 
    status = 'scheduled' 
    AND scheduled_at <= NOW()
  $$
);
