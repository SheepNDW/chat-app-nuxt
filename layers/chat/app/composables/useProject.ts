export default function useProject(projectId: string) {
  const { projects } = useProjects();

  const project = computed(() => projects.value.find((p) => p.id === projectId));

  function updateProjectInList(updatedData: Partial<Project>) {
    if (!project.value) return;

    // Merge with existing to update in our data store
    projects.value = projects.value.map((p) => (p.id === projectId ? { ...p, ...updatedData } : p));
  }

  async function updateProject(updatedProject: Partial<Project>) {
    if (!project.value) return;

    const originalProject = { ...project.value };
    updateProjectInList(updatedProject);

    try {
      const response = await $fetch<Project>(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: { ...updatedProject },
      });

      updateProjectInList(response);
      return response;
    } catch (error) {
      console.error('Error updating project:', error);
      updateProjectInList(originalProject); // Revert to original on error
    }
  }

  return {
    project,
    updateProject,
  };
}
