export default function request (path:string):Promise<any> {
  return new Promise((resolve, reject) => {
    const xhrCallback = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if ((xhr.status === 200) || (xhr.status === 0)) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr);
        }
      }
    };

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = xhrCallback;

    xhr.open('GET', path, true);
    xhr.send();
  });
}
