-- Seed data for Yugi travel itinerary application

-- Insert some popular countries
INSERT INTO public.countries (country_name, country_code) VALUES
  ('France', 'FR'),
  ('Japan', 'JP'),
  ('United States', 'US'),
  ('United Kingdom', 'GB'),
  ('Italy', 'IT'),
  ('Spain', 'ES'),
  ('Germany', 'DE'),
  ('Thailand', 'TH'),
  ('Australia', 'AU'),
  ('Canada', 'CA'),
  ('Greece', 'GR'),
  ('Turkey', 'TR'),
  ('Netherlands', 'NL'),
  ('Portugal', 'PT'),
  ('Austria', 'AT'),
  ('Switzerland', 'CH'),
  ('Czech Republic', 'CZ'),
  ('Iceland', 'IS'),
  ('Norway', 'NO'),
  ('Sweden', 'SE')
ON CONFLICT (country_name) DO NOTHING;

-- Insert popular cities with travel information
INSERT INTO public.cities (city_name, city_description, country_id, broadband_speed, mobile_speed, plugs, voltage, power_standard, frequency, emergency_fire, emergency_police, emergency_ambulance) VALUES
  ('Paris', 'The City of Light, famous for its art, fashion, and culture', (SELECT country_id FROM public.countries WHERE country_name = 'France'), '45 Mbps', '32 Mbps', 'Type C, Type E', '230V', 'European', '50Hz', '18', '17', '15'),
  ('Tokyo', 'Japan''s bustling capital, a blend of tradition and modernity', (SELECT country_id FROM public.countries WHERE country_name = 'Japan'), '95 Mbps', '45 Mbps', 'Type A, Type B', '100V', 'Japanese', '50Hz/60Hz', '119', '110', '119'),
  ('New York', 'The Big Apple, known for its skyscrapers and cultural diversity', (SELECT country_id FROM public.countries WHERE country_name = 'United States'), '65 Mbps', '38 Mbps', 'Type A, Type B', '120V', 'North American', '60Hz', '911', '911', '911'),
  ('London', 'Historic capital with royal palaces and modern attractions', (SELECT country_id FROM public.countries WHERE country_name = 'United Kingdom'), '55 Mbps', '35 Mbps', 'Type G', '230V', 'British', '50Hz', '999', '999', '999'),
  ('Rome', 'The Eternal City, home to ancient history and Vatican City', (SELECT country_id FROM public.countries WHERE country_name = 'Italy'), '42 Mbps', '28 Mbps', 'Type C, Type F, Type L', '230V', 'European', '50Hz', '115', '113', '118'),
  ('Barcelona', 'Catalonian capital known for Gaudí architecture and beaches', (SELECT country_id FROM public.countries WHERE country_name = 'Spain'), '48 Mbps', '32 Mbps', 'Type C, Type F', '230V', 'European', '50Hz', '112', '112', '112'),
  ('Berlin', 'Germany''s capital, rich in history and vibrant culture', (SELECT country_id FROM public.countries WHERE country_name = 'Germany'), '52 Mbps', '35 Mbps', 'Type C, Type F', '230V', 'European', '50Hz', '112', '110', '112'),
  ('Bangkok', 'Thailand''s capital, known for temples, street food, and nightlife', (SELECT country_id FROM public.countries WHERE country_name = 'Thailand'), '38 Mbps', '25 Mbps', 'Type A, Type B, Type C', '220V', 'European/American', '50Hz', '199', '191', '1669'),
  ('Sydney', 'Australia''s harbor city with iconic Opera House', (SELECT country_id FROM public.countries WHERE country_name = 'Australia'), '58 Mbps', '42 Mbps', 'Type I', '230V', 'Australian', '50Hz', '000', '000', '000'),
  ('Toronto', 'Canada''s largest city, multicultural and diverse', (SELECT country_id FROM public.countries WHERE country_name = 'Canada'), '62 Mbps', '38 Mbps', 'Type A, Type B', '120V', 'North American', '60Hz', '911', '911', '911'),
  ('Amsterdam', 'Dutch capital famous for canals, museums, and cycling', (SELECT country_id FROM public.countries WHERE country_name = 'Netherlands'), '78 Mbps', '45 Mbps', 'Type C, Type F', '230V', 'European', '50Hz', '112', '112', '112'),
  ('Prague', 'Czech capital with stunning medieval architecture', (SELECT country_id FROM public.countries WHERE country_name = 'Czech Republic'), '45 Mbps', '32 Mbps', 'Type C, Type E', '230V', 'European', '50Hz', '150', '158', '155'),
  ('Istanbul', 'Turkish city bridging Europe and Asia', (SELECT country_id FROM public.countries WHERE country_name = 'Turkey'), '35 Mbps', '28 Mbps', 'Type C, Type F', '230V', 'European', '50Hz', '110', '155', '112'),
  ('Vienna', 'Austrian capital known for music, art, and coffee culture', (SELECT country_id FROM public.countries WHERE country_name = 'Austria'), '55 Mbps', '38 Mbps', 'Type C, Type F', '230V', 'European', '50Hz', '122', '133', '144'),
  ('Zurich', 'Swiss financial center with pristine lakes and mountains', (SELECT country_id FROM public.countries WHERE country_name = 'Switzerland'), '85 Mbps', '52 Mbps', 'Type C, Type J', '230V', 'European/Swiss', '50Hz', '118', '117', '144')
ON CONFLICT (city_name, country_id) DO NOTHING;