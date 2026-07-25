'use strict';
require('../common');

describe('AttachmentViewer file loading', function () {
    it('waits for the latest selection and ignores stale readers', async function () {
        const clean = globalThis.cleanup();
        const originalFileReader = global.FileReader,
            readers = [];
        class ControlledFileReader {
            constructor() {
                readers.push(this);
            }

            readAsDataURL(file) {
                this.file = file;
            }
        }
        global.FileReader = ControlledFileReader;
        window.FileReader = ControlledFileReader;
        document.body.innerHTML =
            '<div id="attachment"></div>' +
            '<div id="attachmentPreview" class="hidden"></div>' +
            '<div id="dragAndDropFileName"></div>' +
            '<div id="dropzone" class="hidden"></div>' +
            '<input id="file" type="file">';
        PrivateBin.TopNav.highlightFileupload = function () {};
        PrivateBin.TopNav.isAttachmentReadonly = function () { return false; };
        PrivateBin.Editor.isPreview = function () { return false; };
        PrivateBin.AttachmentViewer.init();

        const input = document.getElementById('file');
        Object.defineProperty(input, 'files', {
            value: [{name: 'old.txt'}],
            configurable: true
        });
        input.dispatchEvent(new Event('change'));

        Object.defineProperty(input, 'files', {
            value: [{name: 'new.txt'}],
            configurable: true
        });
        input.dispatchEvent(new Event('change'));
        let latestReadFinished = false;
        const latestRead = PrivateBin.AttachmentViewer.getAttachmentDataPromise()
            .then(() => { latestReadFinished = true; });

        readers[0].onload({
            target: {result: 'data:text/plain;base64,b2xk'}
        });
        await Promise.resolve();
        assert.strictEqual(latestReadFinished, false);
        assert.deepStrictEqual(
            PrivateBin.AttachmentViewer.getAttachmentsData(),
            []
        );

        readers[1].onload({
            target: {result: 'data:text/plain;base64,bmV3'}
        });
        await latestRead;
        assert.deepStrictEqual(
            PrivateBin.AttachmentViewer.getAttachmentsData(),
            ['data:text/plain;base64,bmV3']
        );

        global.FileReader = originalFileReader;
        window.FileReader = originalFileReader;
        clean();
    });
});
