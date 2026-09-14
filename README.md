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
3. Cloudinary analyses eligible images and provides delivery transformations
4. the backend exposes bounded public records instead of raw storage access
5. the browser requests responsive media with automatic format, automatic quality, subject aware gravity, and content aware cropping
6. the public Visual Study Board gathers those assets into one calm discovery surface

The same source image can therefore serve a course card, a blog feature, and a phone sized study board without creating several unmanaged copies

## Track 1

The primary hackathon direction is AI Media Pipelines

The pipeline combines upload handling, Cloudinary AI quality analysis, structured media records, responsive delivery, safe public listing, and cleanup when a draft or rejected record does not become part of the product

The useful result is a media system that helps learners discover the right study material while giving the platform a consistent way to validate, transform, deliver, and retire media

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
