# كورة نيوز | Kora News

موقع إخباري رياضي عربي (RTL) تابع لصفحة [Kora News على فيسبوك](https://www.facebook.com/61550609084848/).

موقع ثابت (static) بدون أي اعتماديات: ملفات Markdown في `posts/` + سكربت بناء `scripts/build.js` (Node 18+)، والنشر التلقائي على GitHub Pages عبر GitHub Actions عند كل push إلى `main`.

## إضافة خبر جديد (للوكلاء والمحررين)

1. أنشئ ملفًا جديدًا في `posts/` باسم مثل `YYYY-MM-DD-short-slug.md` بهذا الشكل:

```markdown
---
title: عنوان الخبر
slug: english-url-slug
date: 2026-11-21T18:00:00+02:00
category: الدوري الإنجليزي
excerpt: ملخص من سطر أو سطرين يظهر في البطاقة.
image: my-image.jpg
facebook: https://www.facebook.com/61550609084848/posts/XXXX   (اختياري)
---

نص الخبر هنا. يدعم Markdown بسيط: **غامق**، عناوين ##، روابط [نص](https://..)، وقوائم بشرطة -.
```

2. ضع صورة الخبر في `assets/img/` بنفس الاسم المذكور في `image:` (يفضل JPG/PNG عرضي ~1072px).
3. `git add . && git commit -m "new post" && git push` — يقوم الـ Action بالبناء والنشر تلقائيًا خلال ~دقيقة.

الحقول الإلزامية: `title`, `slug`, `date`. الباقي اختياري لكن يُنصح به.
أحدث خبر (الأحدث بـ `date`) يظهر كبطاقة رئيسية أعلى الصفحة الرئيسية.

## التشغيل محليًا

```bash
node scripts/build.js   # يبني الموقع في dist/
```

## النشر

- الاستضافة: GitHub Pages (من GitHub Actions - Settings > Pages > Source: GitHub Actions).
- أي push إلى `main` يعيد البناء والنشر تلقائيًا.
