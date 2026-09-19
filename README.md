# Vidhgrow

Vidhgrow is a teacher led learning platform for courses, practice tests, useful feedback, and visible progress

## What it does

The product brings together the parts of study that are usually spread across different tools

1. learners find teacher created courses and platform notes
2. learners practice with timed tests and receive answer level feedback
3. course and test history becomes a readable progress trail
4. teachers create learning material and complete verification before publishing
5. administrators review trust signals, content, users, and platform activity

The product is designed around the next useful action rather than a wall of metrics. A learner can read, practice, review, and return without losing the thread

## How the media workflow works

Media is part of the learning product, not a decorative layer

1. approved course covers and published blog covers enter the media catalogue
2. the backend keeps the source record connected to its course or publication
3. Cloudinary provides the delivery transformations for eligible images
4. the backend exposes bounded public records instead of raw storage access
5. the browser requests responsive media with automatic format, automatic quality, subject aware gravity, and content aware cropping
6. the public Visual Study Board gathers those assets into one calm discovery surface

The same source image can therefore serve a course card, a blog feature, and a phone sized study board without creating several unmanaged copies

## track choice

The current checked in implementation is strongest as Track 3, Your Media Savvy Startup, with a Track 1 shaped media pipeline. Cloudinary is active in the product through source linked records, transformed delivery, automatic format, automatic quality, automatic gravity cropping, and the public media lab

The repository does not claim Cloudinary auto tagging, moderation, background removal, or another AI add on unless that capability is enabled in the Cloudinary account and its result is persisted by the backend. This keeps the submission accurate. To enter Track 1, enable one of those Cloudinary AI capabilities, save its review result beside the media record, and expose the result in the media lab without exposing provider credentials

## Learner readiness signal

During account setup a learner can choose a beginner, intermediate, or advanced starting path. A small local evaluator combines that choice with completed tests, answered questions, and the existing practice percentile

The evaluator is intentionally transparent. It returns a bounded readiness signal and a next step. It does not present itself as a diagnosis, it does not send learner history to an outside AI vendor, and it remains conservative when a new account has little evidence

## Why this matters

Students need more than a content library. They need a clear route from reading to practice and from practice to a better next attempt

Teachers need media that remains connected to the course they created

The platform team needs trust boundaries around uploads, authentication, published content, and public delivery

Vidhgrow joins these needs in one workflow without making the learner understand the infrastructure underneath it

## Public surface

Visual Study Board: \`https://vidhgrow.online/media\`

Blogs: \`https://blogs.vidhgrow.online\`

## Cloudinary media lab

The public media route is a working product surface for the Cloudinary Media Savvy Startup track. A published course cover or blog cover remains connected to its source record, the backend creates a bounded Cloudinary delivery URL, and the browser receives automatic format, automatic quality, and automatic gravity crop transformations. The media lab makes that path visible beside the asset so the demo shows a real workflow instead of presenting Cloudinary as a logo or a static image host

The backend never sends Cloudinary credentials to the browser. It only returns approved course and published blog records, a safe delivery URL, a small delivery profile, and counts that are derived from the returned records. Missing, malformed, or unavailable media becomes an explicit fallback state rather than a broken image or an unbounded provider request

This implementation uses Cloudinary delivery transformations that are available through the normal SDK configuration. Optional Cloudinary add-ons such as automatic tagging or moderation should only be described as active after they are enabled in the Cloudinary account and connected to a persisted review result

## seeded technology catalog

The backend includes a safe, repeatable catalog seed for five practical technology courses and five search-ready platform notes. The courses cover API reliability, cloud security, data engineering, applied machine learning, and frontend performance. Each seeded course gets a Cloudinary-managed cover and a Cloudinary video delivery record. The blog seed includes encrypted content, canonical URLs, useful excerpts, topics, tags, readable titles, and large social images

Run a preview first

```text
cd Backend
npm run seed:tech-catalog
```

The preview does not connect to MongoDB or Cloudinary. After checking the proposed catalog, run the explicit write operation with production credentials loaded in the environment

```text
cd Backend
npm run seed:tech-catalog -- --apply
```

The seed is idempotent for its own course names and blog slugs. It does not replace unrelated course content. The default video source is a Cloudinary demo asset copied into the configured account; set `SEED_VIDEO_SOURCE_URL` to a licensed instructional video before a public launch

To audit existing course covers, question images, and blog covers for third-party URLs, run the dry audit

```text
cd Backend
npm run audit:cloudinary-media
```

Use `npm run audit:cloudinary-media -- --apply` only after reviewing the output. The migration accepts public HTTPS sources, rejects local and private network targets, imports the image into the Vidhgrow Cloudinary folder, and updates the database only when the record still has no Cloudinary public id. It never deletes the old external asset. External video embeds are reported rather than copied automatically because rehosting a video requires permission from its owner

## Local development

The repository is a platform with separate surfaces. Run each process from its own directory and keep provider credentials in the hosting environment or an untracked local environment file

Backend API

```text
cd Backend
npm install
npm run dev
```

Public learner frontend

```text
cd Frontend
npm install
npm run dev
```

Admin portal

```text
cd Admin
npm install
npm run dev
```

Teacher portal

```text
cd Teachers
npm install
npm run dev
```

Server rendered blogs

```text
cd Blogs
npm install
npm start
```

For a production frontend build, run \`npm run build\` inside \`Frontend\`. The build also creates the static SEO surfaces used by the public site. The frontend needs a public \`VITE_API_URL\`; the backend needs MongoDB, cookie and JWT secrets, Redis settings when enabled, and Cloudinary server credentials. Never place \`CLOUDINARY_API_SECRET\`, database URLs, JWT secrets, or private delivery credentials in a \`VITE_\` variable

## Hackathon demo path

The shortest useful walkthrough is a learner opening the media lab, reading the three stage pipeline, opening a responsive course cover, selecting a course, and completing a test. The second pass shows an administrator or teacher creating or publishing the source content. The important product story is the link between content ownership, media delivery, and learning action

The local readiness signal is deliberately bounded and explainable. It uses a learner selected starting level together with first party practice evidence such as completed tests and answered questions. It does not claim to diagnose ability, it does not send learner history to a third party model, and it falls back to a conservative starting state when there is not enough evidence


## Repository map

\`Backend\` contains the application API, authentication, content rules, media handling, and data access

\`Frontend\` contains the learner experience, public course pages, practice flow, progress views, and Visual Study Board

\`Blogs\` contains the server rendered blog experience, topics, authors, comments, sitemap routes, and public media presentation

\`Admin\` contains platform operations, content management, media review, and reporting surfaces

\`Teachers\` contains verification, document handling, course creation, and teacher workflow surfaces

## Trust boundaries

Cloudinary credentials and provider secrets stay on the backend

Public responses contain only the fields needed by the current screen

Media records are linked to their owning content before they become public

Authentication, request signing, origin checks, rate limits, and private delivery decisions remain server side

The local readiness evaluator is an assistive product signal and not a promise of academic performance

## Product walkthrough

The clearest demonstration starts with a learner choosing a starting path, opening the Visual Study Board, entering a teacher created course, completing a timed test, and reading the resulting feedback

The second part shows a teacher or administrator reviewing the media and content lifecycle. The important story is that one approved asset moves through analysis, transformation, delivery, and a useful learner facing surface

## Project boundary

This repository contains the application code and public product surfaces. Deployment values, database records, provider credentials, and private operational configuration belong in the hosting environment and are intentionally not part of this document
