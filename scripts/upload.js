// scripts/upload.js
document.addEventListener("DOMContentLoaded", () => {
    const deptSelect = document.getElementById("department");
    const courseSelect = document.getElementById("course");
    const tagSelect = document.getElementById("tag");
  
    // Fetch and populate departments
    fetch("http://localhost:4000/departments")
      .then(res => res.json())
      .then(data => {
        data.forEach(dept => {
          const option = document.createElement("option");
          option.value = dept.department_id;
          option.textContent = dept.name;
          deptSelect.appendChild(option);
        });
      });
  
    // Fetch and populate tags
    fetch("http://localhost:4000/tags")
      .then(res => res.json())
      .then(data => {
        data.forEach(tag => {
          const option = document.createElement("option");
          option.value = tag.tag_id;
          option.textContent = tag.name;
          tagSelect.appendChild(option);
        });
      });
  
    // When a department is selected, load its courses
    deptSelect.addEventListener("change", () => {
      courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
      const deptId = deptSelect.value;
      if (!deptId) return;
  
      fetch(`http://localhost:4000/courses?department_id=${deptId}`)
        .then(res => res.json())
        .then(data => {
          data.forEach(course => {
            const option = document.createElement("option");
            option.value = course.course_id;
            option.textContent = course.name;
            courseSelect.appendChild(option);
          });
        });
    });
  
    // Handle form submission
    document.getElementById("uploadForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("file");
      const title = document.getElementById("title").value;
      const description = document.getElementById("description").value;
      const departmentId = deptSelect.value;
      const courseId = courseSelect.value;
      const tagId = tagSelect.value;
  
      const file = fileInput.files[0];
  
      if (!file) {
        alert("Please choose a file.");
        return;
      }
  
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("course_id", courseId);
      formData.append("tag_id", tagId);
  
      fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData
      })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed.");
        alert("Upload successful!");
        document.getElementById("uploadForm").reset();
      })
      .catch(err => {
        console.error(err);
        alert("There was a problem uploading the note.");
      });
    });
  });
  