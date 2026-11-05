// Feature switches.
// v2.5.2: adding a person is hidden until the multi-user data model (Steps 3 and 5) exists.
// Today the app shows Becks's data for any person after the first two (isJC ? data.jc : data.becks),
// so a third person would see and could change someone else's data.
export const ALLOW_ADD_PERSON = false;
