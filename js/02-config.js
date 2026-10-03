
    window.SUPABASE_URL = 'https://xbuznnkrkfdsjyjkarjo.supabase.co';
    window.SUPABASE_ANON_KEY = 'sb_publishable_e4kljbGegfh2jVD92MsDKA_XSGQf-sP';
    // Publieke VAPID-sleutel voor browser-pushmeldingen (favorieten-
    // prijsdalingen, nieuwe zoekagent-matches) -- net als de Supabase
    // anon-key hierboven is dit bewust een PUBLIEKE sleutel, veilig in
    // frontend-code. De bijbehorende privésleutel staat alleen als
    // VAPID_PRIVATE_KEY GitHub Actions-secret, gebruikt door
    // scripts/send-notifications.js (lib/webpush.js) om te versturen.
    window.VAPID_PUBLIC_KEY = 'BIOmxYhz2WdlY9hRvFr2ExOWUOoeefPPbjH3iaNzqI5mSi-EZ6hilE_EpqZE0blE60gwyVie_HLp_OgterlWmLU';
  