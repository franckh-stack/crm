# Changelog

## [1.16.0](https://github.com/franckh-stack/crm/compare/v1.15.3...v1.16.0) (2026-09-05)


### Features

* **activities:** allow excluding an email thread from the CRM synthesis ([6a4892d](https://github.com/franckh-stack/crm/commit/6a4892d3f6f8d5c1f838487a1e3cab15c44db60a))
* **activities:** let a rep exclude an email thread from the CRM synthesis ([044e350](https://github.com/franckh-stack/crm/commit/044e350103e955417df5e26cd2f0c348e27e4600))
* **agent:** notify VigieProcure on CRM deal lifecycle events ([c1f4305](https://github.com/franckh-stack/crm/commit/c1f430510589ddb454bc906ad7821cfa75ba5e60))
* **agent:** route the LLM through DeepSeek instead of Vercel AI Gateway, add Dockerfile ([595a6f6](https://github.com/franckh-stack/crm/commit/595a6f6bb1aba2c681094b5c938bc8d0ea818cd2))
* **calendar:** add q param + searchByParticipant for contact history backfill ([68c8b34](https://github.com/franckh-stack/crm/commit/68c8b348170b735b68921d653a29f8647af93322))
* **calendar:** CalendarSyncService gains public apply()/preresolved/backfillForParticipant() ([03a91cc](https://github.com/franckh-stack/crm/commit/03a91cc8a8f84705b7da1c6f6716a3905e10a24c))
* **companies:** resolve and set SIREN via VigieProcure ([32b7f2b](https://github.com/franckh-stack/crm/commit/32b7f2bb4e9d0d67e68b79206aa41bf0a9aff716))
* **companies:** resolve and set SIREN via VigieProcure ([cfdb641](https://github.com/franckh-stack/crm/commit/cfdb64141ff58d29eeadf5d48d57a75e353c29ed))
* **contacts:** add ContactHistoryBackfillService orchestrator ([e97d9b2](https://github.com/franckh-stack/crm/commit/e97d9b2610ae1930ba5c5df0f4a3e7a015099ee8))
* **contacts:** automatic Gmail/Calendar history backfill on contact creation ([4dd3000](https://github.com/franckh-stack/crm/commit/4dd300041f587e263966c1a9dc1710049d0ef91a))
* **contacts:** wire the history backfill into ContactsService.create() ([6946d28](https://github.com/franckh-stack/crm/commit/6946d280b01aa7f87e177b19d22964d5bce3b42a))
* **db:** add siren column to Company, unique scoped on active records ([3d8b5b8](https://github.com/franckh-stack/crm/commit/3d8b5b853b08f22eec8e356f09d450174a3e2418))
* **db:** colonne siren sur Company, unicite scopee archivedAt ([9061103](https://github.com/franckh-stack/crm/commit/9061103e247fa8fd713fb686ac6e26f4589a604b))
* **db:** migration SQL add_company_siren ([aec33d5](https://github.com/franckh-stack/crm/commit/aec33d59927dddf32855b8524ba0d548a937d49e))
* **gmail:** add searchByParticipant for contact history backfill ([5438f58](https://github.com/franckh-stack/crm/commit/5438f58adac3bf8875e94701673575e29e684a4b))
* **mailbox:** ThreadWriterService.store() accepts preresolved company/contact + relinks ([319f3ac](https://github.com/franckh-stack/crm/commit/319f3ac5d85e3fb3b4920617d4f151e24caa2a02))
* release release ([aec4f9d](https://github.com/franckh-stack/crm/commit/aec4f9dcaa934b7147a7fd2ae527163c8aecf2a4))


### Fixes

* **activities:** Notes tab was showing every synced email and meeting ([cb6e6f2](https://github.com/franckh-stack/crm/commit/cb6e6f2473057ea65583bd68209ae7835b693b4e))
* **activities:** scope the Notes tab to notes/calls, not every synced email/meeting ([2c3192e](https://github.com/franckh-stack/crm/commit/2c3192e036ce7d47322cbdd25745ebdd990b7094))
* **anti-slop:** let stubCapturingUrl's return type infer instead of widening ([8d4bb3f](https://github.com/franckh-stack/crm/commit/8d4bb3f9ccfdf4c40108adc20cc9688c46cf45c3))
* **anti-slop:** name captured-value types by their owner, drop dead import ([b645260](https://github.com/franckh-stack/crm/commit/b64526014419238cdd6d23ff882b50d70b379413))
* **anti-slop:** rename error to cause in ContactHistoryBackfillService.failed ([e507553](https://github.com/franckh-stack/crm/commit/e507553f5eb809c9772794185e638d2b11e6d9b7))
* **anti-slop:** type VigieProcureEvent.payload with Prisma.InputJsonValue ([1a99fc4](https://github.com/franckh-stack/crm/commit/1a99fc4c53739f58204e7c5b937f6b75d1862beb))
* **anti-slop:** type VigieProcureEvent.payload with Prisma.InputJsonValue ([d22d613](https://github.com/franckh-stack/crm/commit/d22d6132665c2130d3cefb6953a2f44b5eee1b48))
* **anti-slop:** use toBeFunction() instead of typeof x === "function" ([cba97d1](https://github.com/franckh-stack/crm/commit/cba97d13ea82c0154b0f3a5ebfcc42c00f3dd67e))
* **companies:** validate SIREN digits, drop unused conflict fields ([5d16454](https://github.com/franckh-stack/crm/commit/5d164549f0ebaf9c489fbf36b6a99a377d870916))
* **gmail:** filter mailing-list broadcasts out of the contact relationship view ([e8ca9c2](https://github.com/franckh-stack/crm/commit/e8ca9c2bf4e1a2d0994f82af9ff5f716b6f9ae83))
* **gmail:** filter out mailing-list broadcasts from personal correspondence ([0ffb62c](https://github.com/franckh-stack/crm/commit/0ffb62cb8ff73a538cb012da4df9273798547e06))
* **infra:** apps/app runtime image is node:22-slim directly, no bun ([00cebb9](https://github.com/franckh-stack/crm/commit/00cebb9a0e721d88d1f0a2a8b3b02ea7dcbf29e0))
* **infra:** move @crm/typescript-config and typescript to agent's dependencies ([7a0a50a](https://github.com/franckh-stack/crm/commit/7a0a50a8981c6aaff2c378049b47e698a6268655))
* **infra:** skip postinstall scripts on the production-only reinstall ([120df57](https://github.com/franckh-stack/crm/commit/120df57babc2bde867345e418767b4e00699fd36))
* **infra:** slim api/agent runtime images to production deps only ([eef531c](https://github.com/franckh-stack/crm/commit/eef531c14d8d12678467c9d33b4755287ef77953))


### Refactors

* **gmail:** extract parseGmailMessage into a pure, reusable module ([573c89c](https://github.com/franckh-stack/crm/commit/573c89c74cf8549697c4d323090b26945a8c3ad9))

## [1.15.3](https://github.com/trycompai/crm/compare/v1.15.2...v1.15.3) (2026-08-21)


### Fixes

* **app:** prevent url param collision between fields sheet and table filter ([#175](https://github.com/trycompai/crm/issues/175)) ([1cebe1e](https://github.com/trycompai/crm/commit/1cebe1e5b3087007c4eac8b18add38ff9e8dd69b))
* stop a finished enrichment reading as failed ([#173](https://github.com/trycompai/crm/issues/173)) ([2946580](https://github.com/trycompai/crm/commit/2946580afdd43419ce08165a0d55ba9d084c554e))

## [1.15.2](https://github.com/trycompai/crm/compare/v1.15.1...v1.15.2) (2026-08-20)


### Documentation

* **api:** explain runtime openapi document and vendoring rules ([#170](https://github.com/trycompai/crm/issues/170)) ([630f2c9](https://github.com/trycompai/crm/commit/630f2c9f375b5ae084ed708d21bcdb563c774a4f))

## [1.15.1](https://github.com/trycompai/crm/compare/v1.15.0...v1.15.1) (2026-08-20)


### Fixes

* **api:** serve openapi.json and bundle swagger deps in function build ([#166](https://github.com/trycompai/crm/issues/166)) ([7ea4f37](https://github.com/trycompai/crm/commit/7ea4f37cd65e93d62d3977e08a0df476b3aa4479))

## [1.15.0](https://github.com/trycompai/crm/compare/v1.14.0...v1.15.0) (2026-08-20)


### Features

* **agent:** scope field backfill tasks to records missing values ([#163](https://github.com/trycompai/crm/issues/163)) ([3be7bbd](https://github.com/trycompai/crm/commit/3be7bbd69fe8b814ee2599a29b33e73f02a66245))

## [1.14.0](https://github.com/trycompai/crm/compare/v1.13.0...v1.14.0) (2026-08-18)


### Features

* **agent:** read people from Context.dev instead of RapidAPI (CMP-86) ([#158](https://github.com/trycompai/crm/issues/158)) ([7b9288b](https://github.com/trycompai/crm/commit/7b9288b024f870fe5cb48b642255ebca645c261b))
* enrichment queue widget (CMP-92) ([#159](https://github.com/trycompai/crm/issues/159)) ([5e11482](https://github.com/trycompai/crm/commit/5e11482bee237d94a6eca8dfecbe6e7850df9c7a))
* page the enrichment queue (CMP-92) ([#160](https://github.com/trycompai/crm/issues/160)) ([8c1abb1](https://github.com/trycompai/crm/commit/8c1abb14f4a60e0f9232914958869acccd610f71))


### Fixes

* unblock the test suite and actually install the git hooks (CMP-83) ([#152](https://github.com/trycompai/crm/issues/152)) ([652135b](https://github.com/trycompai/crm/commit/652135be27e9c3e22c06e4d6cfb47746f5c6c9c1))


### Refactors

* clear anti-slop type assertions and conditional object spreads (CMP-81) ([#146](https://github.com/trycompai/crm/issues/146)) ([bfd4dad](https://github.com/trycompai/crm/commit/bfd4dadfd1df44566676902a2477bfa112ca1413))
* parse every remaining I/O boundary into a domain type (CMP-82) ([#151](https://github.com/trycompai/crm/issues/151)) ([3fb9922](https://github.com/trycompai/crm/commit/3fb9922b63aae5e97518d6712037e70b21899a76))


### Documentation

* propose an i18n layer ([#143](https://github.com/trycompai/crm/issues/143)) ([64440c6](https://github.com/trycompai/crm/commit/64440c6827394af69659a1d0205574a6726868a8))

## [1.13.0](https://github.com/trycompai/crm/compare/v1.12.0...v1.13.0) (2026-08-12)


### Features

* **app:** search company dropdowns instead of scrolling them ([#125](https://github.com/trycompai/crm/issues/125)) ([3b558a8](https://github.com/trycompai/crm/commit/3b558a82155d556aa4ff2860121ddf314e2ae88c))


### Fixes

* **agent:** let the assistant chat read the deal list it is told to use (CMP-77) ([#139](https://github.com/trycompai/crm/issues/139)) ([e86a0fb](https://github.com/trycompai/crm/commit/e86a0fbe4076ec3ead43f9ab24c3ac805070819a))
* **app:** show select field values in record tables ([#133](https://github.com/trycompai/crm/issues/133)) ([1d89b43](https://github.com/trycompai/crm/commit/1d89b43e2d0ad376970be09f9446f1903203ec09))

## [1.12.0](https://github.com/trycompai/crm/compare/v1.11.0...v1.12.0) (2026-08-11)


### Features

* edit a deployed agent, and show what Slack actually granted (CMP-77) ([#109](https://github.com/trycompai/crm/issues/109)) ([76b443a](https://github.com/trycompai/crm/commit/76b443ae4fe2567c5c5e51465a82db5faa1f3e62))

## [1.11.0](https://github.com/trycompai/crm/compare/v1.10.0...v1.11.0) (2026-08-11)


### Features

* **app:** copy the tracking snippet for the selected install method ([#128](https://github.com/trycompai/crm/issues/128)) ([30e0137](https://github.com/trycompai/crm/commit/30e01377781559375c3a58ada50b63016dea7d57))

## [1.10.0](https://github.com/trycompai/crm/compare/v1.9.0...v1.10.0) (2026-08-11)


### Features

* **tracking:** support installing the tracking tag via Google Tag Manager ([#124](https://github.com/trycompai/crm/issues/124)) ([2d8129c](https://github.com/trycompai/crm/commit/2d8129ccdd75ca2630289f4bf0cacd04505150b3))

## [1.9.0](https://github.com/trycompai/crm/compare/v1.8.2...v1.9.0) (2026-08-11)


### Features

* **agent:** stop suggesting a URL that already matches the field ([#120](https://github.com/trycompai/crm/issues/120)) ([ed43055](https://github.com/trycompai/crm/commit/ed43055be2885a2de29f16374b07b3e077cace22))

## [1.8.2](https://github.com/trycompai/crm/compare/v1.8.1...v1.8.2) (2026-08-11)


### Fixes

* **agent:** fill blank fields on the dispatch tick instead of sign-in ([#117](https://github.com/trycompai/crm/issues/117)) ([9660952](https://github.com/trycompai/crm/commit/96609529f9f7be27441a88267a05e9a6c8f9c23c))

## [1.8.1](https://github.com/trycompai/crm/compare/v1.8.0...v1.8.1) (2026-08-11)


### Fixes

* **ci:** ship releases by opening a pull request into release ([#114](https://github.com/trycompai/crm/issues/114)) ([924060b](https://github.com/trycompai/crm/commit/924060bac114d7fba6681c6b1b2f38de19f36440))

## [1.8.0](https://github.com/trycompai/crm/compare/v1.7.0...v1.8.0) (2026-08-11)


### Features

* **agent:** apply sourced facts to empty fields automatically ([#112](https://github.com/trycompai/crm/issues/112)) ([0342c8e](https://github.com/trycompai/crm/commit/0342c8ee62561c8df1db16644c2b049617c908a0))

## [1.7.0](https://github.com/trycompai/crm/compare/v1.6.1...v1.7.0) (2026-08-11)


### Features

* **db:** add peek script for inspecting database contents ([#110](https://github.com/trycompai/crm/issues/110)) ([acae8ec](https://github.com/trycompai/crm/commit/acae8ec1ab29851ec66a8a1e8e89672bef6e7eca))

## [1.6.1](https://github.com/trycompai/crm/compare/v1.6.0...v1.6.1) (2026-08-11)


### Fixes

* **ci:** fall back to the pushed commit when release-please reports no sha ([d1efd97](https://github.com/trycompai/crm/commit/d1efd9730570730fc569d124f2c74559d47fe790))
* **ci:** make a release one pull request instead of two ([206c746](https://github.com/trycompai/crm/commit/206c7461e75ee4827960ec07a02843d107514f20))

## [1.6.0](https://github.com/trycompai/crm/compare/v1.5.1...v1.6.0) (2026-08-11)


### Features

* **tracking:** add website tracking with form capture and attribution ([e050ff9](https://github.com/trycompai/crm/commit/e050ff9cd62897880da6cceebe765d51aef8f723))


### Fixes

* **ci:** make the release guard reject only genuinely untagged pull requests ([#105](https://github.com/trycompai/crm/issues/105)) ([815a832](https://github.com/trycompai/crm/commit/815a832fbefe4c96ad15cee1679be116e590e132))
* **ci:** stop the auto-titler downgrading a release ([8a1e390](https://github.com/trycompai/crm/commit/8a1e3901ec5e6eeca13b0b0af4c3edbc0e57736d))

## [1.5.1](https://github.com/trycompai/crm/compare/v1.5.0...v1.5.1) (2026-08-08)


### Fixes

* **api:** warn when the deployed schema does not match schema.prisma ([#88](https://github.com/trycompai/crm/issues/88)) ([f445c68](https://github.com/trycompai/crm/commit/f445c68a815ad1635498591daa494d18d9508ccf))

## [1.5.0](https://github.com/trycompai/crm/compare/v1.4.0...v1.5.0) (2026-08-08)


### Features

* **agent:** bound agent builder retries and improve chat scrolling ([#89](https://github.com/trycompai/crm/issues/89)) ([7780f81](https://github.com/trycompai/crm/commit/7780f81a219813fcf54e6b5dd612a7d40e31d32b))


### Fixes

* **agent:** declare granted write actions in draft access summary ([#93](https://github.com/trycompai/crm/issues/93)) ([ad4f9f3](https://github.com/trycompai/crm/commit/ad4f9f31c81fd6bdad89abb6adb5a208d51c19ed))
* **app:** render agent transcript chronologically with anchored tool results ([#92](https://github.com/trycompai/crm/issues/92)) ([0e68e45](https://github.com/trycompai/crm/commit/0e68e45909182c875ea58ba18fb89d9a87032e11))

## [1.4.0](https://github.com/trycompai/crm/compare/v1.3.0...v1.4.0) (2026-08-07)


### Features

* **agent:** CMP-1 add sandboxed builder and runner runtimes ([#60](https://github.com/trycompai/crm/issues/60)) ([d033dbf](https://github.com/trycompai/crm/commit/d033dbf0a0bc966499454a402219b65130b6397a))
* **app:** CMP-12 review agent drafts before deployment ([#63](https://github.com/trycompai/crm/issues/63)) ([51a4a11](https://github.com/trycompai/crm/commit/51a4a118432863980c88dc0f7c0d9e56aa4462ae))
* **app:** CMP-46 add the private agent builder workspace ([#62](https://github.com/trycompai/crm/issues/62)) ([f64c88f](https://github.com/trycompai/crm/commit/f64c88fe9d3e1a72e67e630f01817f75cfddaedd))
* **app:** CMP-47 add inline composer context ([57336ab](https://github.com/trycompai/crm/commit/57336abc2cc5d599aa1467bae0345482ac3de1d5))
* **db:** CMP-1 persist durable custom agents ([#67](https://github.com/trycompai/crm/issues/67)) ([4e79f83](https://github.com/trycompai/crm/commit/4e79f837dba6654806a1d3f99632ec34343a2b6d))


### Fixes

* **app:** CMP-47 consolidate agent builder presentation ([#64](https://github.com/trycompai/crm/issues/64)) ([1809d27](https://github.com/trycompai/crm/commit/1809d277c31f64b2ea3dd44615175b47bcbbda34))
* **app:** move chat beneath overview in icon rail ([#83](https://github.com/trycompai/crm/issues/83)) ([b63497d](https://github.com/trycompai/crm/commit/b63497d07c5c33d119b9d759c81341e422afd8cd))
* **ci:** tag releases automatically and keep previews off the production schema ([#82](https://github.com/trycompai/crm/issues/82)) ([6078a84](https://github.com/trycompai/crm/commit/6078a84b4fa435914f77601dc2c6e67c28de4bc3))


### Refactors

* **app:** CMP-59 harden CRM UI foundations ([#61](https://github.com/trycompai/crm/issues/61)) ([d8123e6](https://github.com/trycompai/crm/commit/d8123e6dd6a02986d0a9211c68dfaa110cdc0901))

## [1.3.0](https://github.com/trycompai/crm/compare/v1.2.0...v1.3.0) (2026-08-07)


### Features

* **api:** add microsoft sign-in and outlook mailbox sync ([#73](https://github.com/trycompai/crm/issues/73)) ([2a0062f](https://github.com/trycompai/crm/commit/2a0062fb76ffdaa5bbbb3848a5573b8b53cd0036))
* **api:** enhance email domain handling with machine address detection ([70d7e84](https://github.com/trycompai/crm/commit/70d7e84b6532a45fae8cdf98e73aa3f19ff39fbb))
* **api:** enhance onboarding and research key handling ([f1d1332](https://github.com/trycompai/crm/commit/f1d133213042573672fc0a1d819290221eb686a1))
* **api:** implement Context.dev key verification and enhance capabil… ([d42a04e](https://github.com/trycompai/crm/commit/d42a04ec0d2a3d1d35839e8958ad01e12e8f0de0))
* **api:** implement Context.dev key verification and enhance capabilities handling ([5ca4eae](https://github.com/trycompai/crm/commit/5ca4eae9871615bfbffededaceeca2a9e4598348))
* **api:** implement delete functionality for companies, contacts, an… ([96bf31b](https://github.com/trycompai/crm/commit/96bf31b72d0c8d8931d124e8670e2fc02601f830))
* **api:** implement delete functionality for companies, contacts, and deals ([4457f73](https://github.com/trycompai/crm/commit/4457f7348a222ef32d34dedb74c75202c50a01a1))
* **app:** add dashboard and overview components for enhanced user experience ([181bd28](https://github.com/trycompai/crm/commit/181bd28b016c1abacaeec3cf3581e76011af6152))
* **brand-mapping:** introduce fillable function and enhance brand update logic ([aad5945](https://github.com/trycompai/crm/commit/aad59457baca4d99fcb0e693e86623c593fccae7))
* **landing:** enhance agent section and footer for improved layout and user engagement ([ad4ceaa](https://github.com/trycompai/crm/commit/ad4ceaa9abec8eb5a829a2c6d8553614441e3519))
* **proxy:** implement marketing flag for landing page visibility ([81a36d6](https://github.com/trycompai/crm/commit/81a36d66da79564a01a68af43c8639bfd676bdfd))
* **seo-audit:** add SEO audit skill and related resources ([f266040](https://github.com/trycompai/crm/commit/f266040348e91c689170be5d459fe8a9dbf5df64))
* **turbo:** update test dependencies and document workspace behavior ([6d2e6e4](https://github.com/trycompai/crm/commit/6d2e6e445c0618fb73f30f161767f52b647064b3))


### Fixes

* **app:** generate route types before type checking ([03d4069](https://github.com/trycompai/crm/commit/03d406976cc0a15601b53516a3041c27606489ed))
* **proxy:** refine redirect logic for sign-in path ([73875f0](https://github.com/trycompai/crm/commit/73875f0cc22852a035a4f832beb3ced6d111decd))
* **proxy:** update redirect logic for signed-out users ([8871e49](https://github.com/trycompai/crm/commit/8871e49d153db694933537a6ac28219d7761478b))


### Refactors

* **api:** enhance deletion logic and activity stamp handling ([68f6014](https://github.com/trycompai/crm/commit/68f6014eeb68b3fe863fd81e7cb266e2a309d4d0))
* **api:** improve email normalization and enhance record deletion handling ([277afef](https://github.com/trycompai/crm/commit/277afef311bd0aa3f48443046052d588c912d673))
* **api:** update record deletion tests and enhance agent task handling ([82694a6](https://github.com/trycompai/crm/commit/82694a6c4a3b9774e672207e9ca9f413c96dd9fe))
* **landing:** remove unused Link imports from agent and capabili… ([e2a5a7f](https://github.com/trycompai/crm/commit/e2a5a7fc8dd42bdb210e4b1ea851ebde46195392))
* **landing:** remove unused Link imports from agent and capabilities sections ([66213dd](https://github.com/trycompai/crm/commit/66213dd2dec88954a831771ccb087f78ce7d7e20))
* **landing:** replace Link components with divs for improved layout consistency ([79749f5](https://github.com/trycompai/crm/commit/79749f5e0f760a7d8ceacac6a02e5c30e1d9d2e1))
* **proxy:** streamline onboarding and research gate handling ([a189eab](https://github.com/trycompai/crm/commit/a189eab99a74e574ca95df8648d58c9109bad0e1))
* **proxy:** streamline onboarding and research gate handling ([14cb932](https://github.com/trycompai/crm/commit/14cb93285600164f61834126098ad7d507141f82))


### Documentation

* **env:** document landing page behavior based on IS_MARKETING flag ([bde4fd5](https://github.com/trycompai/crm/commit/bde4fd55aeb848f3fb7b4ee207f12c5bf37c7866))
* **env:** update .env.example and api.md to clarify marketing flag usage ([34900ae](https://github.com/trycompai/crm/commit/34900ae78faa490f0bbe6fc8d9a2fc742f7dd959))
* **README:** add stars badge for project visibility ([4dd7e90](https://github.com/trycompai/crm/commit/4dd7e90632d98911c5a4531848ef6bdf9626eb19))
* **README:** align images for better presentation in the README ([a075794](https://github.com/trycompai/crm/commit/a075794975b2beef2cdab16cf11e38b5d0bd3423))
* **README:** remove duplicate stars badge and improve project visibility ([96173a1](https://github.com/trycompai/crm/commit/96173a1ebb6f37167cac443a4f508ef7f15433cb))
* **README:** update stars badge positioning for improved visibility ([b48268e](https://github.com/trycompai/crm/commit/b48268e18cf93686006a7d57ee31918fb41c8ecb))

## [1.2.0](https://github.com/trycompai/crm/compare/v1.1.0...v1.2.0) (2026-08-07)


### Features

* **api:** add microsoft sign-in and outlook mailbox sync ([#73](https://github.com/trycompai/crm/issues/73)) ([2a0062f](https://github.com/trycompai/crm/commit/2a0062fb76ffdaa5bbbb3848a5573b8b53cd0036))

## [1.1.0](https://github.com/trycompai/crm/compare/v1.0.0...v1.1.0) (2026-08-06)


### Features

* **api:** enhance email domain handling with machine address detection ([70d7e84](https://github.com/trycompai/crm/commit/70d7e84b6532a45fae8cdf98e73aa3f19ff39fbb))
* **api:** enhance onboarding and research key handling ([f1d1332](https://github.com/trycompai/crm/commit/f1d133213042573672fc0a1d819290221eb686a1))
* **api:** implement Context.dev key verification and enhance capabil… ([d42a04e](https://github.com/trycompai/crm/commit/d42a04ec0d2a3d1d35839e8958ad01e12e8f0de0))
* **api:** implement Context.dev key verification and enhance capabilities handling ([5ca4eae](https://github.com/trycompai/crm/commit/5ca4eae9871615bfbffededaceeca2a9e4598348))
* **api:** implement delete functionality for companies, contacts, an… ([96bf31b](https://github.com/trycompai/crm/commit/96bf31b72d0c8d8931d124e8670e2fc02601f830))
* **api:** implement delete functionality for companies, contacts, and deals ([4457f73](https://github.com/trycompai/crm/commit/4457f7348a222ef32d34dedb74c75202c50a01a1))
* **app:** add dashboard and overview components for enhanced user experience ([181bd28](https://github.com/trycompai/crm/commit/181bd28b016c1abacaeec3cf3581e76011af6152))
* **landing:** enhance agent section and footer for improved layout and user engagement ([ad4ceaa](https://github.com/trycompai/crm/commit/ad4ceaa9abec8eb5a829a2c6d8553614441e3519))
* **proxy:** implement marketing flag for landing page visibility ([81a36d6](https://github.com/trycompai/crm/commit/81a36d66da79564a01a68af43c8639bfd676bdfd))
* **seo-audit:** add SEO audit skill and related resources ([f266040](https://github.com/trycompai/crm/commit/f266040348e91c689170be5d459fe8a9dbf5df64))
* **turbo:** update test dependencies and document workspace behavior ([6d2e6e4](https://github.com/trycompai/crm/commit/6d2e6e445c0618fb73f30f161767f52b647064b3))


### Fixes

* **app:** generate route types before type checking ([03d4069](https://github.com/trycompai/crm/commit/03d406976cc0a15601b53516a3041c27606489ed))
* **proxy:** refine redirect logic for sign-in path ([73875f0](https://github.com/trycompai/crm/commit/73875f0cc22852a035a4f832beb3ced6d111decd))
* **proxy:** update redirect logic for signed-out users ([8871e49](https://github.com/trycompai/crm/commit/8871e49d153db694933537a6ac28219d7761478b))


### Refactors

* **api:** enhance deletion logic and activity stamp handling ([68f6014](https://github.com/trycompai/crm/commit/68f6014eeb68b3fe863fd81e7cb266e2a309d4d0))
* **api:** improve email normalization and enhance record deletion handling ([277afef](https://github.com/trycompai/crm/commit/277afef311bd0aa3f48443046052d588c912d673))
* **api:** update record deletion tests and enhance agent task handling ([82694a6](https://github.com/trycompai/crm/commit/82694a6c4a3b9774e672207e9ca9f413c96dd9fe))
* **landing:** remove unused Link imports from agent and capabili… ([e2a5a7f](https://github.com/trycompai/crm/commit/e2a5a7fc8dd42bdb210e4b1ea851ebde46195392))
* **landing:** remove unused Link imports from agent and capabilities sections ([66213dd](https://github.com/trycompai/crm/commit/66213dd2dec88954a831771ccb087f78ce7d7e20))
* **landing:** replace Link components with divs for improved layout consistency ([79749f5](https://github.com/trycompai/crm/commit/79749f5e0f760a7d8ceacac6a02e5c30e1d9d2e1))
* **proxy:** streamline onboarding and research gate handling ([a189eab](https://github.com/trycompai/crm/commit/a189eab99a74e574ca95df8648d58c9109bad0e1))
* **proxy:** streamline onboarding and research gate handling ([14cb932](https://github.com/trycompai/crm/commit/14cb93285600164f61834126098ad7d507141f82))


### Documentation

* **env:** document landing page behavior based on IS_MARKETING flag ([bde4fd5](https://github.com/trycompai/crm/commit/bde4fd55aeb848f3fb7b4ee207f12c5bf37c7866))
* **env:** update .env.example and api.md to clarify marketing flag usage ([34900ae](https://github.com/trycompai/crm/commit/34900ae78faa490f0bbe6fc8d9a2fc742f7dd959))
* **README:** add stars badge for project visibility ([4dd7e90](https://github.com/trycompai/crm/commit/4dd7e90632d98911c5a4531848ef6bdf9626eb19))
* **README:** align images for better presentation in the README ([a075794](https://github.com/trycompai/crm/commit/a075794975b2beef2cdab16cf11e38b5d0bd3423))
* **README:** remove duplicate stars badge and improve project visibility ([96173a1](https://github.com/trycompai/crm/commit/96173a1ebb6f37167cac443a4f508ef7f15433cb))
* **README:** update stars badge positioning for improved visibility ([b48268e](https://github.com/trycompai/crm/commit/b48268e18cf93686006a7d57ee31918fb41c8ecb))

## 1.0.0 (2026-08-03)


### Features

* **brand-mapping:** introduce fillable function and enhance brand update logic ([aad5945](https://github.com/trycompai/crm/commit/aad59457baca4d99fcb0e693e86623c593fccae7))
