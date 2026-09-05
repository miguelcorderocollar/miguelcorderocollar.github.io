const dialog = document.querySelector("#shader-dialog");
const explainButton = document.querySelector("#explain-button");
const closeDialog = document.querySelector("#close-dialog");

explainButton.addEventListener("click", () => dialog.showModal());
closeDialog.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
