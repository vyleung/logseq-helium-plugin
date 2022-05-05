import "@logseq/libs";

const settings = [
  {
    key: "VideoPosition",
    title: "Edit the top position of the floated video",
    description: "Default: -3em. To move the video lower, insert a more positive number (e.g. -2em). To move the video higher, insert a more negative number (e.g. -4em)",
    type: "string",
    default: "-3em"
  },
  {
    key: "IconTopPosition",
    title: "Edit the top position of the balloon icon next to the floated video",
    description: "Default: 1em. To move the balloon icon lower, insert a more positive number (e.g. 2em). To move the balloon icon higher, insert a more negative number (e.g. 0em)",
    type: "string",
    default: "1em"
  },
  {
    key: "IconLeftPosition",
    title: "Edit the left position of the balloon icon next to the floated video",
    description: "Default: 0.25em. To move the balloon icon farther from the video (more right), insert a more positive number (e.g. 1em). To move the balloon icon closer to the video (more left), insert a more negative number (e.g. -1em)",
    type: "string",
    default: "0.25em"
  },
  {
    key: "KeyboardShortcut",
    title: "Keyboard shortcut to start/stop floating the video",
    description: 'This is the keyboard shortcut to start/stop the video from floating (default: ctrl+shift+h). Insert "NA" if you do NOT want to have a keyboard shortcut',
    type: "string",
    default: "ctrl+shift+h"
  }
]
logseq.useSettingsSchema(settings);

const block_id_prefix = `div[id^="ls-block"]`;
let float = true;
let block_uuid_start;

function startFloat(e) {
  block_uuid_start = e.uuid;
  const video_position = logseq.settings.VideoPosition;
  const icon_top_position = logseq.settings.IconTopPosition;
  const icon_left_position = logseq.settings.IconLeftPosition;
  
  logseq.Editor.getBlock(block_uuid_start).then(block => {
    let block_content = block.content;
    let youtube_embed = block_content.match(/({{youtube[\s\S]*?}})/gm);

    // if it's a youtube embed, display the balloon icon + increase/decrease height controls next to the top right corner of the video
    if (youtube_embed) {
      let youtube_id = youtube_embed[0].split("watch?v=")[1].split("}}")[0];

      logseq.provideUI ({
        key: "helium",
        path: `${block_id_prefix}[id$="${block_uuid_start}"] > .flex.flex-row.pr-2`,
        template: 
        `
        <ul style="position:absolute; list-style-type:none; margin-top:${icon_top_position}; margin-left:${icon_left_position};">
          <li>
            <a class="helium" data-helium-id="${block_uuid_start}" data-on-click="stop_float">
              <svg width="4em" height="4em" viewBox="0 0 72 72" id="emoji" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="color">
                  <polygon fill="#D22F27" points="33.9763,42.6906 34.0061,49.1497 34.0359,55.6089 28.1166,51.8019 22.1972,47.995 28.0868,45.3428"/>
                  <circle cx="45" cy="27" r="23.0003" fill="#EA5A47"/>
                  <path fill="#D22F27" d="M60.8265,10.549c-1.3409-1.3409-2.8082-2.477-4.3606-3.4175c5.3598,8.8471,4.2238,20.5254-3.4175,28.1667 s-19.3196,8.7774-28.1667,3.4175c0.9405,1.5525,2.0767,3.0197,3.4175,4.3606c8.9822,8.9822,23.5452,8.9822,32.5273,0 C69.8087,34.0942,69.8087,19.5312,60.8265,10.549z"/>
                </g>
                <g id="hair"/>
                <g id="skin"/>
                <g id="skin-shadow"/>
                <g id="line">
                  <polyline fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2.1216" points="34,47.2098 34.01,49.1498 34.04,55.6098 28.12,51.7998 22.2,47.9998 28.09,45.3398 30.04,44.4598"/>
                  <circle cx="45" cy="27" r="23.0003" fill="none" stroke="#000000" stroke-miterlimit="10" stroke-width="2"/>
                  <path fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2" d="M17.7253,65.09c0.5048,0.0395,1.0254-0.0002,1.547-0.1285c2.7035-0.6648,4.41-3.458,3.8116-6.2388"/>
                  <path fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2" d="M23.1406,58.907c-0.1631-0.4794-0.2535-0.9936-0.2582-1.5307c-0.0246-2.7839,2.2596-5.1284,5.102-5.2364"/>
                </g>
              </svg>
            </a>
          </li>
          <li class="helium-controls" style="margin-left:1.775em;">
            <a class="button" data-on-click="toggle_controls">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-dimensions" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M3 5h11" />
                <path d="M12 7l2 -2l-2 -2" />
                <path d="M5 3l-2 2l2 2" />
                <path d="M19 10v11" />
                <path d="M17 19l2 2l2 -2" />
                <path d="M21 12l-2 -2l-2 2" />
                <rect x="3" y="10" width="11" height="11" rx="2" />
              </svg>
            </a>
          </li>
          <div id="controls-container" style="display:none; margin-left:0.1em;">
            <ul style="display:flex; list-style-type:none; margin: 0 0 0 0.2em;">
              <li class="helium-controls icon" title="Decrease video height">
                <a class="button" data-helium-decrease-height-id="${youtube_id}" data-on-click="decrease_video_height">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
              <li class="helium-controls letter" style="margin: 0 0.325em;">H</li>
              <li class="helium-controls icon" title="Increase video height">
                <a class="button" data-helium-increase-height-id="${youtube_id}" data-on-click="increase_video_height">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
            </ul>
            <ul style="display:flex; list-style-type:none; margin: 0 0 0 0.2em;">
              <li class="helium-controls icon" title="Decrease video width">
                <a class="button" data-helium-decrease-width-id="${youtube_id}" data-on-click="decrease_video_width">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
              <li class="helium-controls letter" style="margin: 0 0.25em;">W</li>
              <li class="helium-controls icon" title="Increase video width">
                <a class="button" data-helium-increase-width-id="${youtube_id}" data-on-click="increase_video_width">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </ul>
        `
      });
    }
    // otherwise, only display the balloon icon next to the top right corner of the video
    else {
      logseq.provideUI({
        key: "helium",
        path: `${block_id_prefix}[id$="${block_uuid_start}"] > .flex.flex-row.pr-2`,
        template: `
        <ul style="position:absolute; list-style-type:none; margin-left:0.25em; margin-top:${icon_top_position}">
          <li>
            <a class="helium" data-helium-id="${block_uuid_start}" data-on-click="stop_float">
              <svg width="4em" height="4em" viewBox="0 0 72 72" id="emoji" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="color">
                  <polygon fill="#D22F27" points="33.9763,42.6906 34.0061,49.1497 34.0359,55.6089 28.1166,51.8019 22.1972,47.995 28.0868,45.3428"/>
                  <circle cx="45" cy="27" r="23.0003" fill="#EA5A47"/>
                  <path fill="#D22F27" d="M60.8265,10.549c-1.3409-1.3409-2.8082-2.477-4.3606-3.4175c5.3598,8.8471,4.2238,20.5254-3.4175,28.1667 s-19.3196,8.7774-28.1667,3.4175c0.9405,1.5525,2.0767,3.0197,3.4175,4.3606c8.9822,8.9822,23.5452,8.9822,32.5273,0 C69.8087,34.0942,69.8087,19.5312,60.8265,10.549z"/>
                </g>
                <g id="hair"/>
                <g id="skin"/>
                <g id="skin-shadow"/>
                <g id="line">
                  <polyline fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2.1216" points="34,47.2098 34.01,49.1498 34.04,55.6098 28.12,51.7998 22.2,47.9998 28.09,45.3398 30.04,44.4598"/>
                  <circle cx="45" cy="27" r="23.0003" fill="none" stroke="#000000" stroke-miterlimit="10" stroke-width="2"/>
                  <path fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2" d="M17.7253,65.09c0.5048,0.0395,1.0254-0.0002,1.547-0.1285c2.7035-0.6648,4.41-3.458,3.8116-6.2388"/>
                  <path fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2" d="M23.1406,58.907c-0.1631-0.4794-0.2535-0.9936-0.2582-1.5307c-0.0246-2.7839,2.2596-5.1284,5.102-5.2364"/>
                </g>
              </svg>
            </a>
          </li>
        </ul>`
      });
    }
  });

  // float the video
  logseq.provideStyle(`
  ${block_id_prefix}[id$="${block_uuid_start}"] > .flex.flex-row.pr-2 {
    position: sticky;
    top: ${video_position};
    z-index: 5;
    background-color: var(--ls-primary-background-color);
  }
  .helium-controls {
    width: fit-content;
    margin-top: 0;
  }
  .helium-controls.letter {
    color: var(--ls-primary-text-color);
    opacity: 0.6;
    cursor: default;
  }
`);

  float = false;
}

function stopFloat(e) {
  let block_uuid_stop = (e.uuid == undefined) ? e.dataset.heliumId : e.uuid;
  const plugin_dev = parent.document.getElementById("logseq-helium-plugin--helium");
  const plugin_prod = parent.document.getElementById("helium--logseq-helium-plugin");
  
  // reset the display of the video
  logseq.provideStyle(`
    ${block_id_prefix}[id$="${block_uuid_stop}"] > .flex.flex-row.pr-2 {
      position: relative;
      top: 0;
      background-color: none;
    }
  `);

  // remove the balloon icon (+ increase/decrease height controls if it's a youtube embed)
  if (plugin_prod) {
    plugin_prod.remove();
  }
  else if (plugin_dev) {
    plugin_dev.remove();
  }
  else {
    console.log("logseq-helium-plugin: Can't find balloon's block uuid");
  }

  float = true;
}

const main = async () => {
  console.log("logseq-helium-plugin loaded"); 

  logseq.provideModel({
    // clicking on the balloon icon resets the block back to normal
    stop_float(e) {
      stopFloat(e);
    },
    toggle_controls() {
      let controls_container = parent.document.getElementById("controls-container");
      controls_container.style.display = (controls_container.style.display === "none") ? "block" : "none";
    },
    // clicking on the "+" button increases the youtube video height by 32px
    increase_video_height(e) {
      let youtube_iframe_increase_h = parent.document.getElementById(`youtube-player-${e.dataset.heliumIncreaseHeightId}`);
      let youtube_iframe_increase_height = youtube_iframe_increase_h.getBoundingClientRect().height;
      youtube_iframe_increase_height += 32;
      youtube_iframe_increase_h.style.height = `${youtube_iframe_increase_height}px`;
    },
    // clicking on the "-" button decreases the youtube video height by 32px
    decrease_video_height(e) {
      let youtube_iframe_decrease_h = parent.document.getElementById(`youtube-player-${e.dataset.heliumDecreaseHeightId}`);
      let youtube_iframe_decrease_height = youtube_iframe_decrease_h.getBoundingClientRect().height;
      youtube_iframe_decrease_height -= 32;
      youtube_iframe_decrease_h.style.height = `${youtube_iframe_decrease_height}px`;
    },
    // clicking on the "+" button increases the youtube video width by 32px
    increase_video_width(e) {
      let youtube_iframe_increase_w = parent.document.getElementById(`youtube-player-${e.dataset.heliumIncreaseWidthId}`);
      let youtube_iframe_increase_width = youtube_iframe_increase_w.getBoundingClientRect().width;
      youtube_iframe_increase_width += 32;
      youtube_iframe_increase_w.style.width = `${youtube_iframe_increase_width}px`;
    },
    // clicking on the "-" button decreases the youtube video width by 32px
    decrease_video_width(e) {
      let youtube_iframe_decrease_w = parent.document.getElementById(`youtube-player-${e.dataset.heliumDecreaseWidthId}`);
      let youtube_iframe_decrease_width = youtube_iframe_decrease_w.getBoundingClientRect().width;
      youtube_iframe_decrease_width -= 32;
      youtube_iframe_decrease_w.style.width = `${youtube_iframe_decrease_width}px`;
    }
  });

  // register keyboard shortcut to start/stop floating videos
  let keyboard_shortcut_version = 0;
  function registerKeyboardShortcut(type, version, keyboard_shortcut) {
    logseq.App.registerCommandPalette({
      key: `helium-${type}-${version}`,
      label: "Start/stop floating video",
      keybinding: {
        binding: keyboard_shortcut,
        mode: "global",
      }
    }, async () => {
      if (float) {
        logseq.Editor.checkEditing().then(block_uuid => {
          if (block_uuid) {
            logseq.Editor.getBlock(block_uuid).then(block => {
              startFloat(block);
            });
            logseq.Editor.exitEditingMode();
          }
          else {
            logseq.App.showMsg("No video was selected to float", "warning");
          }
        });
      }
      else {
        logseq.Editor.getBlock(block_uuid_start).then(block => {
          stopFloat(block);
        });
      }
    });
  }

  // unregister keyboard shortcut to start/stop floating videos
  function unregisterKeyboardShortcut(type, version) {
    logseq.App.unregister_plugin_simple_command(`${logseq.baseInfo.id}/helium-${type}-${version}`);
  }

  logseq.onSettingsChanged(updated_settings => {
    if (updated_settings.KeyboardShortcut != "NA") {
      // register default keyboard shortcut
      if ((keyboard_shortcut_version == 0) && (updated_settings.KeyboardShortcut != undefined)) {
        registerKeyboardShortcut("KeyboardShortcut", keyboard_shortcut_version, updated_settings.KeyboardShortcut);
        
        // keyboard_shortcut_version = 0 => 1;
        keyboard_shortcut_version++;
      }
      // when the keyboard shortcut is modified:
      else {
        // keyboard_shortcut_version = 1 => 0;
        keyboard_shortcut_version--;

        // unregister previous shortcut
        unregisterKeyboardShortcut("KeyboardShortcut", keyboard_shortcut_version);
      }
    }
  });

  // slash command - float the video
  logseq.Editor.registerSlashCommand("🎈 Start float", async (e) => {
    startFloat(e);
  });

  // slash command - display the video as normal
  logseq.Editor.registerSlashCommand("❌ Stop float", async (e) => {
    stopFloat(e);
  });

  // right click - float the video
  logseq.Editor.registerBlockContextMenuItem("🎈 Start float", async (e) => {
    startFloat(e);
  });

  // right click - display the video as normal
  logseq.Editor.registerBlockContextMenuItem("❌ Stop float", async (e) => {
    stopFloat(e);
  });
}

logseq.ready(main).catch(console.error);