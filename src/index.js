import "@logseq/libs";
import { setDriftlessTimeout } from "driftless";

const settings = [
  {
    key: "Note",
    title: "Note: Insert NA where you do NOT want to assign a keyboard shortcut",
    type: "heading"
  },
  {
    key: "VideoPosition",
    title: "Edit the top position of the floated video",
    description: "Default: -2em. To move the video lower, insert a more positive number (e.g. -1em). To move the video higher, insert a more negative number (e.g. -3em)",
    type: "string",
    default: "-2em"
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
    key: "KeyboardShortcut_Helium",
    title: "Keyboard shortcut to start/stop floating the video",
    description: 'This is the keyboard shortcut to start/stop the video from floating (default: ctrl+shift+h).',
    type: "string",
    default: "ctrl+shift+h"
  },
  {
    key: "KeyboardShortcut_PlayPause",
    title: "Keyboard shortcut to play/pause the video",
    description: "This is the keyboard shortcut to play/pause the video (default: mod+alt+k - Mac: cmd+alt+k | Windows: ctrl+alt+k)",
    type: "string",
    default: "mod+alt+k"
  },
  {
    key: "KeyboardShortcut_SkipForward",
    title: "Keyboard shortcut to skip forward in videos",
    description: "This is the keyboard shortcut to skip forward in videos (default: mod+alt+l - Mac: cmd+alt+l | Windows: ctrl+alt+l)",
    type: "string",
    default: "mod+alt+l"
  },
  {
    key: "KeyboardShortcut_SkipBackward",
    title: "Keyboard shortcut to skip backward in videos",
    description: "This is the keyboard shortcut to skip backward in videos (default: mod+alt+j - Mac: cmd+alt+j | Windows: ctrl+alt+j)",
    type: "string",
    default: "mod+alt+j"
  },
  {
    key: "SkipDuration",
    title: "Skip forward/backward X seconds in videos",
    description: "Skip forward (fast forward) or backwards (rewind) a certain number of seconds in videos (default: 10)",
    type: "number",
    default: 10
  },
  {
    key: "PlaybackSpeedIncrement",
    title: "Increase/decrease playback speed increment for videos",
    description: "This is the custom playback speed increment for videos (default: 0.25)",
    type: "number",
    default: 0.25
  },
  {
    key: "DefaultPlaybackSpeed",
    title: "Default playback speed for videos",
    description: "This is the playback speed for videos (default: 1; min: 0.25, max: 2)",
    type: "number",
    default: 1
  }
]
logseq.useSettingsSchema(settings);

const block_id_prefix = `div[id^="ls-block"]`;
let activate_helium = true;
let float = true;
let play = true;
let block_uuid_start;
let parent_block;
let parent_block_width;
let parent_block_original_width;
let parent_block_children;

let video_id;
let video_embed;
let video_embed_iframe;
let video_embed_legacy;
let video_embed_iframe_legacy;
let local_video_embed;
let youtube_embed;

let current_video;
let video_dimensions;
let video_iframe;
let video_iframe_increase_height;
let video_iframe_decrease_height;
let video_iframe_increase_width;
let video_iframe_decrease_width;

let skip;
let skip_duration;
let playback;
let playback_speed;
let playback_speed_increment;

function startFloat(e) {
  const video_position = logseq.settings.VideoPosition;
  const icon_top_position = logseq.settings.IconTopPosition;
  const icon_left_position = logseq.settings.IconLeftPosition;
  block_uuid_start = e.uuid;
  parent_block = parent.document.querySelector(`${block_id_prefix}[id$="${block_uuid_start}`);
  parent_block_original_width = parent_block.getBoundingClientRect().width;
  
  logseq.Editor.getBlock(block_uuid_start).then(block => {
    let block_content = block.content;
    video_embed_legacy = (block_content.match(/({{youtube [\s\S]*?}})/gm)) || (block_content.match(/({{vimeo [\s\S]*?}})/gm));
    video_embed = block_content.match(/({{video [\s\S]*?}})/gm);
    local_video_embed = parent_block.querySelector("video");

    // iframes
    if (video_embed) {
      video_embed_iframe = parent_block.querySelector("iframe");
    
      // if the iframe doesn't have an id, give it one
      if ((video_embed_iframe) && (video_embed_iframe.id == "")) {
        video_embed_iframe.id = `helium-videoEmbed-${block_uuid_start}`;
      }
      video_id = video_embed_iframe.id;
    }
    // local videos
    else if ((!video_embed) && (local_video_embed)) {
      if ((local_video_embed) && (local_video_embed.id == "")) {
        local_video_embed.id = `helium-localVideo-${block_uuid_start}`;
      }
      video_id = local_video_embed.id;
      local_video_embed.addEventListener("click", playPauseControls_Listener);
    }
    // iframes using the legacy {{youtube URL}} or {{vimeo URL}} macros
    else if ((!video_embed) && (video_embed_legacy)) {
      video_embed_iframe_legacy = parent_block.querySelector("iframe");

      // if the iframe doesn't have an id, give it one
      if ((video_embed_iframe_legacy) && (video_embed_iframe_legacy.id == "")) {
        video_embed_iframe_legacy.id = `helium-videoEmbed-${block_uuid_start}`;
      }
      video_id = video_embed_iframe_legacy.id;

      logseq.UI.showMsg(`Please use the {{video URL}} macro moving foward.\nInfo about the macro can be found here: https://github.com/logseq/logseq/pull/5396`, "error");
    }
    else {
      activate_helium = false;
      console.log("logseq-helium-plugin - ERROR: start float");
    }

    if (activate_helium) {
      // display the balloon icon + increase/decrease height controls next to the top right corner of the video
      logseq.provideUI ({
        key: "helium",
        path: `${block_id_prefix}[id$="${block_uuid_start}"] > .flex.flex-row.pr-2`,
        template: 
        `
        <ul style="position:absolute; list-style-type:none; margin-top:${icon_top_position}; margin-left:${icon_left_position}; background:var(--ls-primary-background-color)">
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
          <div id="controls-container" style="display:none; margin-left:0.05em;">
            <ul style="display:flex; list-style-type:none; margin: 0 0 0 0.2em;">
              <li class="helium-controls icon" title="Decrease video height">
                <a class="button" data-on-click="decrease_video_height">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
              <li class="helium-controls letter" style="margin: 0 0.375em;">H</li>
              <li class="helium-controls icon" title="Increase video height">
                <a class="button" data-on-click="increase_video_height">
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
                <a class="button" data-on-click="decrease_video_width">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
              <li class="helium-controls letter" style="margin: 0 0.25em;">W</li>
              <li class="helium-controls icon" title="Increase video width">
                <a class="button" data-on-click="increase_video_width">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
            </ul>
            <ul style="display:flex; list-style-type:none; margin: 0 0 0 0.2em;">
              <li class="helium-controls icon" title="Decrease video height and width">
                <a class="button" data-on-click="decrease_video_height_width">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
              <li class="helium-controls letter" style="margin: 0.15em;">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-aspect-ratio" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M7 12v-3h3" />
                  <path d="M17 12v3h-3" />
                </svg>
              </li>
              <li class="helium-controls icon" title="Increase video height and width">
                <a class="button" data-on-click="increase_video_height_width">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
          <li class="helium-controls" style="margin-left:1.65em;">
            <a class="button" data-on-click="toggle_playback_speed">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-gauge" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="1" />
                <line x1="13.41" y1="10.59" x2="16" y2="8" />
                <path d="M7 12a5 5 0 0 1 5 -5" />
              </svg>
            </a>
          </li>
          <div id="playback-speed-container" style="display:none; margin-left: -0.65em;">
            <ul style="display:flex; list-style-type:none; margin: 0 0 0 0.2em;">
              <li class="helium-controls icon" title="Decrease playback speed">
                <a class="button" data-on-click="decrease_playback_speed">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
              <li class="helium-controls number" id="playback-speed" style="margin: 0.1em 0.375em; width:42px; font-size:0.9em; font-weight:500;">1.00x</li>
              <li class="helium-controls icon" title="Increase playback speed">
                <a class="button" data-on-click="increase_playback_speed">
                  <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
          <ul id="helium-media-controls" style="list-style-type:none; margin: 0;">
            <li class="helium-controls icon" style="margin-left:0.05em;">
              <a class="button" data-on-click="skip_backward">
                <svg id="skip-backward" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-track-prev" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M21 5v14l-8 -7z" />
                  <path d="M10 5v14l-8 -7z" />
                </svg>
              </a>
            </li>
            <li class="helium-controls" id="helium-controls-play-pause" style="margin-left: -0.05em;">
              <a class="button" id="helium-play-pause-button" data-on-click="play_pause">
              </a>
            </li>
            <li class="helium-controls icon">
              <a class="button" data-on-click="skip_forward">
                <svg id="skip-forward" style="margin-left: 0.1em;" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-track-next" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M3 5v14l8 -7z" />
                  <path d="M14 5v14l8 -7z" />
                </svg>
              </a>
            </li>
          </ul>
        </ul>
        `
      });

      // float the video
      logseq.provideStyle(`
        ${block_id_prefix}[id$="${block_uuid_start}"] > .flex.flex-row.pr-2, ${block_id_prefix}[id$="${block_uuid_start}"] {
          position: sticky;
          top: ${video_position};
          z-index: 5;
          background: var(--ls-primary-background-color);
        }
        .helium-controls {
          width: fit-content;
          margin-top: 0;
        }
        .helium-controls.letter, .helium-controls.number {
          color: var(--ls-primary-text-color);
          opacity: 0.6;
          cursor: default;
        }
        a.button {
          display: flex;
          align-items: center;
          padding: 0.25em;
        }
      `);

      // media controls currently only display for youtube videos and local videos (v.2.0.0+)
      if (video_id.includes("helium-videoEmbed")) {
        logseq.provideStyle(`
          #helium-media-controls {
            display: none;
          }
        `)
      }
      else {
        logseq.provideStyle(`
          #helium-media-controls {
            display: flex;
          }
        `)

        // set default playback speed for videos and show appropriate play/pause icon based on whether the video is paused or not
        setDriftlessTimeout(() => {
          // youtube videos
          if (video_id.includes("youtube-player")) {
            current_video = parent.window.YT.get(video_id);
            current_video.setPlaybackRate(parseInt(logseq.settings.DefaultPlaybackSpeed));
            
            // if the video is paused or cued
            if ((current_video.getPlayerState() == 2)|| (current_video.getPlayerState() == 5)) {
              showPlayButton();
            }
            // if the video is playing
            else if (current_video.getPlayerState() == 1) {
              showPauseButton();
              play = true;
            }
          }
          // local videos
          else if (video_id.includes("helium-localVideo")) {
            current_video = parent.document.getElementById(`${video_id}`);
            current_video.playbackRate = parseInt(logseq.settings.DefaultPlaybackSpeed);

            if (current_video.paused) {
              showPlayButton();
            }
            else {
              showPauseButton();
              play = true;
            }
          }
        }, 10);
      } 
    }
  });

  float = false;
  play = false;
}

function stopFloat(e) {
  if (local_video_embed) {
    local_video_embed.removeEventListener("click", playPauseControls_Listener);
  }

  let block_uuid_stop = (e.uuid == undefined) ? e.dataset.heliumId : e.uuid;
  const plugin_dev = parent.document.getElementById("logseq-helium-plugin--helium");
  const plugin_prod = parent.document.getElementById("helium--logseq-helium-plugin");
  
  // reset the style of the block the video is located in
  logseq.provideStyle(`
    ${block_id_prefix}[id$="${block_uuid_stop}"] > .flex.flex-row.pr-2, ${block_id_prefix}[id$="${block_uuid_start}"] {
      position: relative;
      top: 0;
      background: none;
      z-index: 0;
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

function videoDimensionsControls() {
  video_iframe = parent.document.getElementById(video_id);

  function increaseVideoHeight() {
    video_iframe_increase_height = video_iframe.getBoundingClientRect().height;
    video_iframe_increase_height += 32;
    video_iframe.style.height = `${video_iframe_increase_height}px`;
  }

  function decreaseVideoHeight() {
    video_iframe_decrease_height = video_iframe.getBoundingClientRect().height;
    video_iframe_decrease_height -= 32;
    video_iframe.style.height = `${video_iframe_decrease_height}px`;
  }

  function increaseVideoWidth() {
    video_iframe_increase_width = video_iframe.getBoundingClientRect().width;
    video_iframe_increase_width += 32;
    video_iframe.style.width = `${video_iframe_increase_width}px`;

    // adjust width of parent block
    parent_block_width = parent_block.getBoundingClientRect().width;
    parent_block_width += 32;
    parent_block.style.width = `${parent_block_width}px`;

    // don't adjust the width of the parent block's children
    parent_block_children = parent.document.querySelector(`${block_id_prefix}[id$="${block_uuid_start}"] > .block-children-container.flex`);
    if (parent_block_children) {
      parent_block_children.style.width = `${parent_block_original_width}px`;
    }
  }

  function decreaseVideoWidth() {
    video_iframe_decrease_width = video_iframe.getBoundingClientRect().width;
    video_iframe_decrease_width -= 32;
    video_iframe.style.width = `${video_iframe_decrease_width}px`;

    // adjust width of parent block (can't be lower than original width)
    parent_block_width = parent_block.getBoundingClientRect().width;
    if (parent_block_width > parent_block_original_width) {
      parent_block_width -= 32;
      parent_block.style.width = `${parent_block_width}px`;
    }
    else {
      parent_block.style.width = `${parent_block_original_width}px`;
    }
  }

  if (video_dimensions == "increase height") {
    increaseVideoHeight();
  }
  else if (video_dimensions == "decrease height") {
    decreaseVideoHeight();
  }
  else if (video_dimensions == "increase width") {
    increaseVideoWidth();
  }
  else if (video_dimensions == "decrease width") {
    decreaseVideoWidth();
  }
  else if (video_dimensions == "increase height and width") {
    increaseVideoHeight();
    increaseVideoWidth();
  }
  else if (video_dimensions == "decrease height and width") {
    decreaseVideoHeight();
    decreaseVideoWidth();
  }
}

function playPauseControls() {
  // youtube videos
  if (video_id.includes("youtube-player")) {
    current_video = parent.window.YT.get(video_id);
    (play) ? current_video.pauseVideo() : current_video.playVideo();
  }
  // local videos
  else if (video_id.includes("helium-localVideo")) {
    current_video = parent.document.getElementById(`${video_id}`);
    (play) ? current_video.pause() : current_video.play();
  }

  // TODO: figure out how to play/pause bilibili and vimeo videos programatically
  // else if (video_id.includes("helium-videoEmbed")) {
    // current_video = parent.document.getElementById(`${video_id}`);

    // bilibli video
    // if (current_video.src.includes("bilibili")) {
    // }
    // vimeo video
    // else if (current_video.src.includes("vimeo")) {
    // }
  // }

  if (play) {
    // pause the video and show the play button
    showPlayButton();
    play = false;
  }
  else {
    // play the video and show the pause button
    showPauseButton();
    play = true;
  }
}

function playPauseControls_Listener() {
  current_video = parent.document.getElementById(`${video_id}`);
  (current_video.paused) ? showPauseButton() : showPlayButton();
}

function showPlayButton() {
  parent.document.getElementById("helium-controls-play-pause").style.marginTop = "0.05em";

  // play icon
  parent.document.getElementById("helium-play-pause-button").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="var(--ls-primary-text-color)" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M7 4v16l13 -8z" />
  </svg>`;
}

function showPauseButton() {
  parent.document.getElementById("helium-controls-play-pause").style.marginTop = "0em";
  
  // pause icon
  parent.document.getElementById("helium-play-pause-button").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="var(--ls-primary-text-color)" fill="var(--ls-primary-text-color)" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <rect x="6" y="5" width="4" height="16" rx="1" />
    <rect x="16" y="5" width="4" height="16" rx="1" />
  </svg>`;
}

function skipControls() {
  // update the skip duration when it's changed in the settings
  skip_duration = parseInt(logseq.settings.SkipDuration);
  logseq.onSettingsChanged(updated_settings => {
    skip_duration = parseInt(updated_settings.SkipDuration);
  });

  if (skip == "forward") {
    parent.document.getElementById("skip-forward").style.fill = "var(--ls-primary-text-color)";
    setDriftlessTimeout(() => {
      parent.document.getElementById("skip-forward").style.fill = "none";
    }, 250);

    // youtube videos
    if (video_id.includes("youtube-player")) {
      // ref to get youtube timestamp: https://github.com/stefanbuck/logseq-media-controls/blob/e3fbcdb5a5dc49df6789ad79816bb981ac96a318/index.ts#L64-L65
      youtube_embed = parent.window.YT.get(video_id);
      youtube_embed.seekTo(youtube_embed.getCurrentTime() + skip_duration);

      if (youtube_embed.getPlayerState() == 5) {
        showPauseButton();
      }
    }
    // local videos
    else if (video_id.includes("helium-localVideo")) {
      parent.document.getElementById(`${video_id}`).currentTime += skip_duration;
    }
  }
  else if (skip == "backward") {
    parent.document.getElementById("skip-backward").style.fill = "var(--ls-primary-text-color)";
    setDriftlessTimeout(() => {
      parent.document.getElementById("skip-backward").style.fill = "none";
    }, 250);

    // youtube videos
    if (video_id.includes("youtube-player")) {
      youtube_embed = parent.window.YT.get(video_id);
      youtube_embed.seekTo(youtube_embed.getCurrentTime() - skip_duration);
    }
    // local videos
    else if (video_id.includes("helium-localVideo")) {
      parent.document.getElementById(`${video_id}`).currentTime -= skip_duration;
    }
  }
  else {
    console.log("logseq-helium-plugin - ERROR: skip controls");
  }
}

function playbackSpeedControls() {
  // update the playback speed interval when it's changed in the settings
  playback_speed_increment = parseFloat(logseq.settings.PlaybackSpeedIncrement);
  logseq.onSettingsChanged(updated_settings => {
    playback_speed_increment = parseFloat(updated_settings.SkipDuration);
  });

  if (playback == "increase") {
    // youtube videos
    if (video_id.includes("youtube-player")) {
      youtube_embed = parent.window.YT.get(video_id);
      playback_speed = youtube_embed.getPlaybackRate() + playback_speed_increment;

      setDriftlessTimeout(() => {
        youtube_embed.setPlaybackRate(playback_speed);
      }, 50);
    }
    // local videos
    else if (video_id.includes("helium-localVideo")) {
      parent.document.getElementById(`${video_id}`).playbackRate += playback_speed_increment;
      playback_speed = parent.document.getElementById(`${video_id}`).playbackRate;
    }
  }
  else if (playback == "decrease") {
    // youtube videos
    if (video_id.includes("youtube-player")) {
      if (youtube_embed.getPlaybackRate() > 0) {
        youtube_embed = parent.window.YT.get(video_id);
        playback_speed = youtube_embed.getPlaybackRate() - playback_speed_increment;
        youtube_embed.setPlaybackRate(playback_speed);
      }
    }
    // local videos
    else if (video_id.includes("helium-localVideo")) {
      if (parent.document.getElementById(`${video_id}`).playbackRate > 0) {
        parent.document.getElementById(`${video_id}`).playbackRate -= playback_speed_increment;
        playback_speed = parent.document.getElementById(`${video_id}`).playbackRate;
      }
    }
  }

  if (playback_speed > 0) {
    parent.document.getElementById("playback-speed").textContent = `${playback_speed.toFixed(2)}x`;
  }
}

const main = async () => {
  console.log("logseq-helium-plugin loaded"); 

  logseq.provideModel({
    // clicking on the balloon icon resets the block back to normal
    stop_float(e) {
      stopFloat(e);
    },
    // toggles the display of the controls container underneath the balloon icon
    toggle_controls() {
      const controls_container = parent.document.getElementById("controls-container");
      controls_container.style.display = (controls_container.style.display === "none") ? "block" : "none";
    },
    // clicking on the "+" button next to the "H" increases the video height by 32px
    increase_video_height() {
      video_dimensions = "increase height";
      videoDimensionsControls();
    },
    // clicking on the "-" button next to the "H" decreases the video height by 32px
    decrease_video_height() {
      video_dimensions = "decrease height";
      videoDimensionsControls();
    },
    // clicking on the "+" button next to the "W" increases the video width by 32px
    increase_video_width() {
      video_dimensions = "increase width";
      videoDimensionsControls();
    },
    // clicking on the "-" button next to the "W" decreases the video width by 32px
    decrease_video_width() {
      video_dimensions = "decrease width";
      videoDimensionsControls();
    },
    // clicking on the "+" button next to the "aspect-ratio" icon increases the video height by 32px and width by 32px
    increase_video_height_width() {
      video_dimensions = "increase height and width";
      videoDimensionsControls();
    },
    // clicking on the "-" button next to the "aspect-ratio" icon decreases the youtube video height by 32px and width by 32px
    decrease_video_height_width() {
      video_dimensions = "decrease height and width";
      videoDimensionsControls();
    },
    toggle_playback_speed() {
      const playback_speed_container = parent.document.getElementById("playback-speed-container");
      playback_speed_container.style.display = (playback_speed_container.style.display === "none") ? "block" : "none";
    },
    increase_playback_speed(e) {
      playback = "increase";
      playbackSpeedControls(e);
    },
    decrease_playback_speed() {
      playback = "decrease";
      playbackSpeedControls();
    },
    play_pause() {
      playPauseControls();
    },
    skip_forward() {
      skip = "forward";
      skipControls();
    },
    skip_backward() {
      skip = "backward";
      skipControls();
    }
  });

  // register keyboard shortcuts
  function registerKeyboardShortcuts() {
    if (logseq.settings.KeyboardShortcut_Helium != "NA") {
      logseq.App.registerCommandPalette({
        key: `helium-keyboard-shortcut`,
        label: "Start/stop floating video",
        keybinding: {
          binding: logseq.settings.KeyboardShortcut_Helium,
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
              logseq.UI.showMsg("No video was selected to float", "warning");
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

    // play/pause
    if (logseq.settings.KeyboardShortcut_PlayPause != "NA") {
      logseq.App.registerCommandPalette({
        key: `helium-play-pause`,
        label: "Play/pause the video",
        keybinding: {
          binding: logseq.settings.KeyboardShortcut_PlayPause,
          mode: "global",
        }
      }, async () => {
        playPauseControls();
      });
    }
    
    // skip forward (fast forward)
    if (logseq.settings.KeyboardShortcut_SkipForward != "NA") {
      logseq.App.registerCommandPalette({
        key: `helium-skip-controls-FF`,
        label: "Fast forward the video",
        keybinding: {
          binding: logseq.settings.KeyboardShortcut_SkipForward,
          mode: "global",
        }
      }, async () => {
        logseq.Editor.exitEditingMode(true);
        skip = "forward";
        skipControls();
      });
    }

    if (logseq.settings.KeyboardShortcut_SkipBackward != "NA") {
      // skip backward (rewind)
      logseq.App.registerCommandPalette({
        key: `helium-skip-controls-R`,
        label: "Rewind the video",
        keybinding: {
          binding: logseq.settings.KeyboardShortcut_SkipBackward,
          mode: "global",
        }
      }, async () => {
        logseq.Editor.exitEditingMode(true);
        skip = "backward";
        skipControls();
      });
    }
  }
  registerKeyboardShortcuts();

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