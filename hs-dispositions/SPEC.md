The goal of this project is to create a navigable browser and selector for teachers at Nido de Aguilas international school. Teachers are identifying skills and dispositions for their courses for the purpose of giving specific grades as part of reports. 

The dispositions are described in the nido_skills_dispositions text file. This file contains descriptions of the  dispositions, questions that relate to each type of thinking, and specific attributes that relate to that disposition. You can see three slides for Empathy in this directory, showing the definition of Empathy and the performance areas of Emotional Awareness, Deep Listening, and Perspective-taking.

 The image "Nido Learners.jpg" has the relationship of these dispositions with the five attributes of the Nido Learner: Connector, Thinker, Inquirer, Designer, and Changemaker.

The goal is to provide teachers the chance to select their department, and then potentially courses (from the course catalog JSON), to identify which dispositions they are selecting.

We are not sure if we are doing course and disposition, or just departments and disposition, so it would be good to include that as a possibility in the architecture. The goal is to ultimately show either by department, or by course, which dispositions have been selected. It would also be nice for teachers to include ideas around collecting evidence related to the disposition that was selected. This would be individual teachers giving their ideas. 

There is a potential_UI.jpeg that shows a possible way to input this information. teachers might be asked to select a certain number of dispositions for either the department. A style.css has font and color branding for our school to ensure this matches our styles.

I'd like to use Firebase to store selections for each teacher, storing the username, department, course, and disposition selected. This would also allow for inputting the name automatically and recording their department as well. This would allow for the potential of getting individual teacher ideas within their department for specific courses.

The secondary idea is to be able to have a cool animated visualization of departments and the disposiions they have selected across the five dispositions. As either a department or a course selects dispositions, it gets added to the group. This could be circles or bubbles that cluster together by department, or courses/departments clustered together by dispositions. It would be a fun way to navigate through this.

I am thinking this is a single page HTML file, with CSS and data files loaded in separately. You can load files from a CDN if needed, though I may provide these locally (or if you can download them as needed) so that this is a tight build. 

If you have any further questions, let me know.

