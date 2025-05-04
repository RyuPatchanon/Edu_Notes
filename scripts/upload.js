document.addEventListener('DOMContentLoaded', () => {
    const fetchCoursesAndTags = async () => {
        const courseDropdown = document.getElementById('course_id');
        const tagDropdown = document.getElementById('tag_id');
  
        if (!courseDropdown || !tagDropdown) {
            console.error('Required DOM elements not found');
            return;
        }
  
        try {
            // Fetch all courses
            const courseRes = await fetch(`${API_BASE_URL}/courses`);
            const courses = await courseRes.json();
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.course_id;
                option.textContent = course.name;
                courseDropdown.appendChild(option);
            });
  
            // Fetch all tags
            const tagRes = await fetch(`${API_BASE_URL}/tags`);
            const tags = await tagRes.json();
            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.tag_id;
                option.textContent = tag.name;
                tagDropdown.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to fetch courses or tags:', err);
        }
    };
  
    const form = document.getElementById('upload-note-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
  
          try {
              const response = await fetch(`${API_BASE_URL}/upload`, {
                  method: 'POST',
                  body: formData
              });
  
              if (response.ok) {
                  alert('Note uploaded successfully!');
                  form.reset();
              } else {
                  const error = await response.text();
                  alert('Upload failed: ' + error);
              }
          } catch (err) {
              alert('An error occurred during upload.');
              console.error(err);
          }
      });
    } else {
      console.error('Upload form not found');
    }
  
    fetchCoursesAndTags();
  });  