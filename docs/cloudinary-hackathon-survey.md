# cloudinary hackathon survey draft

This draft keeps the submission factual and leaves account specific links as placeholders

## brief project description

Vidhgrow is a teacher led learning platform rather than a single page website. It brings course material, timed practice tests, answer feedback, learner progress, teacher workflows, and a public media lab into one product. The media lab shows how course and blog media stays connected to its source, is transformed for delivery, and becomes a useful route into the learning experience

## project url

https://vidhgrow.online/media

## github url

Add the public repository URL after the repository is made public

## media needs and cloudinary usage

Vidhgrow needs course covers, blog covers, teacher supplied documents, and future lesson media to remain reliable across desktop and mobile surfaces. Cloudinary is used as an active delivery step, not only as a file host. The backend keeps the media record connected to the course or post, creates secure Cloudinary delivery URLs with automatic format and quality, applies automatic gravity cropping for the media lab surface, and returns only bounded public records. The frontend shows the delivery path beside each asset and provides an explicit unavailable preview state when the source is missing

This design lets one approved asset serve a course card, a blog feature, and the media lab without creating unmanaged copies for every screen. Upload validation, publication state, ownership checks, cleanup, and private media decisions remain server side

The catalog seed adds five practical technology courses with Cloudinary-managed covers and Cloudinary video delivery records. A separate audit command reports external image URLs and can import only reviewed public HTTPS images into the Vidhgrow Cloudinary folder. The migration is opt-in and does not delete the source asset

## cloudinary rating

5

## capabilities used

Cloudinary Upload API and SDK configuration, transformed image delivery, automatic format, automatic quality, automatic gravity crop, responsive public delivery, and source linked media records

Starter kit selection: We did not use a starter kit

Skills Pack selection: We did not install a Cloudinary Skills Pack in the repository. Optional AI add ons should be declared only after they are enabled and their persisted results are wired into the review flow

## prompt engineering notes

The useful prompts focused on a real product constraint: make the media workflow visible to a learner without exposing provider secrets or claiming AI work that is not configured. Prompts that asked for a generic gallery produced decorative cards and were not useful. Prompts that asked for a source to delivery to learning action sequence produced the media lab pipeline, bounded API response, delivery metadata, responsive empty states, and a clearer demo narrative

## recording link

Add the public 2 to 4 minute walkthrough URL here

## ai models used to build the solution

GPT 5.6 for code analysis, implementation, debugging, and documentation. The shipped learner readiness signal is a small first party deterministic evaluator and does not depend on a third party inference API

## follow up

Yes
