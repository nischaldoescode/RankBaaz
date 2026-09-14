# Vidhgrow

Vidhgrow is a teacher led learning platform for courses, practice tests, feedback, and visible progress

## Cloudinary feature

Vidhgrow includes a public Visual Study Board at `/media`

The board turns approved course covers and published blog covers into one useful discovery surface for learners. It helps a student find the next course or platform note without opening several separate pages

The board uses Cloudinary as an active delivery service

1. The backend selects only approved course media and published blog media
2. The upload pipeline asks Cloudinary AI for image quality analysis, keeps the returned quality signal with pending media, and creates secure delivery URLs with automatic format, automatic quality, automatic subject gravity, and responsive cropping
3. The browser receives only safe public records and transformed media URLs
4. The interface uses lazy loading, descriptive alternative text, responsive cards, search, media filters, loading states, and empty states

This fits the media savvy startup track because media is part of the learning workflow rather than decoration. Cloudinary keeps the same source asset useful across course cards, blog cards, and the public study board

## Track 1 workflow

Track 1 is the primary implementation

When media enters the platform, the backend keeps the original asset reference, applies a bounded Cloudinary delivery transformation, and sends a browser friendly result to the right surface. The public board uses automatic format, automatic quality, automatic subject gravity, and responsive crop so the same course or blog image remains useful on a wide screen and a phone

The account setup also asks a learner to choose a beginner, intermediate, or advanced starting path. A small local readiness evaluator combines that choice with completed tests, answered questions, and the existing practice percentile. It returns a transparent signal and next steps. It does not claim to be a diagnosis, it does not send learner data to an AI vendor, and it becomes more reliable only after real practice exists

This gives the product two connected benefits. Cloudinary makes the media pipeline faster and more consistent, while the local evaluator helps the learner decide what to open next. The score is bounded, explainable, and safe to show even when a new account has no history

## Product value

The feature helps learners scan the learning library quickly, reduces unnecessary page loads, adapts delivery to the visitor browser, and gives Vidhgrow one clear place to show the work created by teachers and the platform team

## Public links

Dashboard: `https://vidhgrow.online/media`

Live demo link: add the final deployed dashboard link here

Demo video link: add the two to four minute walkthrough link here

## Local setup

Install dependencies in each application directory

```text
cd Backend
npm install

cd Frontend
npm install

cd Blogs
npm install
```

Run the backend, public frontend, and blog service with the commands defined in their package files

The backend needs MongoDB, Redis, and Cloudinary configuration through the deployment environment. The frontend needs the public API base URL. The blog service needs its public site URL and API base URL

## Deployment

The visual board is part of the public frontend and the data comes from the backend. It does not need a separate dashboard service

1. Deploy the backend as a Node web service with `Backend` as its root directory, `npm install` as the build command, and `npm start` as the start command
2. Add the backend database, Redis, Cloudinary, authentication, mail, and CORS secrets to the backend service only
3. Keep `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_SECRET_KEY` on the backend. The browser must never receive the Cloudinary secret key
4. Deploy the frontend as a static site with `Frontend` as its root directory, `npm install` followed by `npm run build` as the build command, and `dist` as the publish directory
5. Set `VITE_API_URL` on the frontend to the public backend origin, such as `https://api.vidhgrow.online`
6. Keep the existing frontend rewrite to `index.html` so a direct visit to `/media` reaches the React route
7. Deploy the backend first, then the frontend, and open `https://vidhgrow.online/media` after both services are healthy

The first board request can return an empty state when no approved course or published blog has a usable image. That is expected. Upload or publish one valid asset, wait for the backend cache window to pass, and refresh the board. A failed backend or missing Cloudinary configuration shows a retry state instead of exposing provider details

## Cloudinary configuration

Use deployment secrets only

```text
CLOUDINARY_NAME=replace_with_cloud_name
CLOUDINARY_API_KEY=replace_with_api_key
CLOUDINARY_SECRET_KEY=replace_with_api_secret
```

The secret key is used only by the backend. Never place it in frontend variables, browser code, screenshots, or a public issue

## Security

Public endpoints return bounded records and do not accept arbitrary Cloudinary public identifiers. Authentication, request signatures, rate limits, origin checks, and private media flows remain on the backend. User uploads and blog media should be validated before persistence and removed when a draft is discarded

The repository must contain no database URI, payment secret, mail secret, signing secret, private key, or Cloudinary secret. Set those values in the hosting provider secret manager

## Verification

Run the backend lint task and the frontend production build before deployment

```text
cd Backend
npm run lint

cd Frontend
npm run build
```

The frontend board should be checked at desktop and mobile widths, with an empty library, a failed API response, a slow image, reduced motion, a search with symbols, and a browser with a narrow viewport

## Submission checklist

1. Add the live dashboard link
2. Add the public repository link
3. Add the demo video link
4. Show a real upload or existing media asset flowing through Cloudinary delivery transformations
5. Complete the required Cloudinary feedback survey
6. Confirm that no secret value appears in the repository history
