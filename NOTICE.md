# Third-party notices and provenance — 0.7.0

- **QR Code generator library**, Project Nayuki, MIT license. Vendored `public/vendor/qrcodegen.js`, retrieved 2026-10-10 from https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js . Original copyright/license header is retained. Only modification: append `export { qrcodegen };` for ES-module loading. No runtime CDN dependency.
- **Node.js 24.19.0 Windows x64**, supplied in the separate portable bundle `runtime/node.exe`. Complete Node and bundled third-party license text is `runtime/LICENSE-node.txt`, obtained from https://raw.githubusercontent.com/nodejs/node/v24.19.0/LICENSE . SHA256 is listed in the delivery checksums. Source repository excludes the runtime binary.
- App source, new project documentation and purely synthetic fixtures in this release use the root personal noncommercial source-available license. Previously granted rights in older releases remain unaffected. Clinical guidelines and linked references retain their original rights and are cited, not redistributed as licensed code. System fonts are not bundled.
- No code was copied from the earlier headache-diary project comparison repositories. No third-party clinical questionnaire is presented as a validated or licensed scale. The FHIR mapping is a local example with project-owned identifiers, not an implementation-guide conformance claim.

This software was implemented with AI assistance from the user's clinical/product requirements. Independent clinical review, translation review, security review and patient studies remain pending. No fabricated contributors, institutions or outcomes are listed.


The optional ASR adapter example is original integration code. No faster-whisper package, model weights, training data or recorded human speech is redistributed in this bundle. Installers must review the chosen package/model licenses separately. The UI audio check used a locally generated one-second sine wave, not patient speech.
