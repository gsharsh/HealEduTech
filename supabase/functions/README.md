# Server-side functions

Place privileged operations such as staff invitations and administrative account changes here. Functions must authenticate the caller, check the caller's role and organisation scope, validate input, and keep service-role credentials server-side.

Add each operation as a separate Supabase Edge Function when its feature is implemented and cover its authorisation rules with integration tests.
